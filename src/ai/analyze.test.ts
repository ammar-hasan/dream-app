/** Document analysis + feedback rule engine on synthetic documents. */

import { describe, expect, it } from 'vitest';
import { createDocument, createLayer } from '../engine/document';
import type { DreamDocument, StrokeOp } from '../engine/types';
import {
  analyzeDocument,
  describeDocument,
  editRegionForSelection,
  feedbackForAnalysis,
} from './analyze';

function stroke(color: string, x: number, y: number, size: number): StrokeOp {
  return {
    kind: 'stroke',
    id: `op-${color}-${x}-${y}`,
    tool: 'brush',
    color,
    opacity: 1,
    size,
    points: [
      { x, y },
      { x: x + size, y: y + size },
    ],
  };
}

function docWith(width: number, height: number, ops: StrokeOp[]): DreamDocument {
  const doc = createDocument({ width, height });
  return { ...doc, layers: [{ ...doc.layers[0], operations: ops }] };
}

describe('analyzeDocument', () => {
  it('reports layers, ops and hidden layers', () => {
    const base = createDocument({ width: 100, height: 100 });
    const hidden = { ...createLayer('Hidden', [stroke('#ff0000', 10, 10, 20)]), visible: false };
    const doc = {
      ...base,
      layers: [{ ...base.layers[0], operations: [stroke('#0000ff', 10, 10, 20)] }, hidden],
    };
    const a = analyzeDocument(doc);
    expect(a.layerCount).toBe(2);
    expect(a.hiddenLayerCount).toBe(1);
    expect(a.opCount).toBe(1); // hidden content is not counted
    expect(a.palette[0].color).toBeDefined();
  });

  it('measures coverage from content bounds', () => {
    const small = docWith(100, 100, [stroke('#000000', 0, 0, 10)]);
    const big = docWith(100, 100, [stroke('#000000', 0, 0, 90)]);
    expect(analyzeDocument(small).coverage).toBeLessThan(analyzeDocument(big).coverage);
    expect(analyzeDocument(big).coverage).toBeGreaterThan(0.5);
  });

  it('detects warmth from the palette', () => {
    const warm = docWith(100, 100, [stroke('#ff5500', 0, 0, 200)]);
    const cool = docWith(100, 100, [stroke('#0055ff', 0, 0, 200)]);
    expect(analyzeDocument(warm).warmth).toBeGreaterThan(0);
    expect(analyzeDocument(cool).warmth).toBeLessThan(0);
  });
});

describe('describeDocument', () => {
  it('summarizes without pixels', () => {
    const doc = docWith(200, 100, [stroke('#ff0000', 10, 10, 30)]);
    const text = describeDocument(doc);
    expect(text).toContain('200x100');
    expect(text).toContain('1 layer');
    expect(text).toContain('1 objects');
    expect(text).toContain('#ff0000');
  });
});

describe('feedbackForAnalysis', () => {
  it('encourages a blank canvas', () => {
    const doc = createDocument({ width: 100, height: 100 });
    const { summary, suggestions } = feedbackForAnalysis(analyzeDocument(doc), doc);
    expect(summary).toMatch(/blank/i);
    expect(suggestions).toEqual([]);
  });

  it('flags a chilly palette with a one-click warm fix', () => {
    const doc = docWith(100, 100, [stroke('#0033cc', 0, 0, 200)]);
    const { suggestions } = feedbackForAnalysis(analyzeDocument(doc), doc);
    const warm = suggestions.find(
      (s) => s.action?.kind === 'adjust' && s.action.adjustments.sepia !== undefined,
    );
    expect(warm).toBeDefined();
  });

  it('flags low contrast with a one-click contrast fix', () => {
    // One gray mark on a white canvas: nearly uniform brightness.
    const doc = docWith(100, 100, [stroke('#fafafa', 0, 0, 200)]);
    const { suggestions } = feedbackForAnalysis(analyzeDocument(doc), doc);
    expect(
      suggestions.some(
        (s) => s.action?.kind === 'adjust' && s.action.adjustments.contrast !== undefined,
      ),
    ).toBe(true);
  });

  it('only suggests centering when the selection is off-centre', () => {
    const doc = docWith(100, 100, [stroke('#888888', 40, 40, 20)]);
    const a = analyzeDocument(doc);
    const off = feedbackForAnalysis(a, doc, { x: 0, y: 0, width: 10, height: 10 });
    expect(off.suggestions.some((s) => s.action?.kind === 'center-selection')).toBe(true);
    const centred = feedbackForAnalysis(a, doc, { x: 40, y: 40, width: 20, height: 20 });
    expect(centred.suggestions.some((s) => s.action?.kind === 'center-selection')).toBe(false);
  });
});

describe('editRegionForSelection', () => {
  it('returns the selection bounds clamped to the document', () => {
    const op = stroke('#000000', -20, -20, 100);
    const doc = docWith(100, 100, [op]);
    const region = editRegionForSelection(doc, doc.layers[0], [op.id]);
    expect(region).not.toBeNull();
    expect(region!.x).toBeGreaterThanOrEqual(0);
    expect(region!.y).toBeGreaterThanOrEqual(0);
    expect(region!.x + region!.width).toBeLessThanOrEqual(100);
    expect(region!.y + region!.height).toBeLessThanOrEqual(100);
  });

  it('is null without a selection or layer', () => {
    const doc = docWith(100, 100, [stroke('#000000', 10, 10, 20)]);
    expect(editRegionForSelection(doc, doc.layers[0], [])).toBeNull();
    expect(editRegionForSelection(doc, undefined, ['op-1'])).toBeNull();
    expect(editRegionForSelection(doc, doc.layers[0], ['missing-id'])).toBeNull();
  });
});
