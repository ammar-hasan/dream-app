/** Store integration for the AI panel: insert, edit bake, apply-suggestion. */

import { beforeEach, describe, expect, it } from 'vitest';
import { useDreamStore } from './dreamStore';
import { selectionUnionBounds } from '../engine/selection';
import type { PixelBuffer } from '../engine/filters';

const store = () => useDreamStore.getState();

function pixels(width: number, height: number, r = 200): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = r;
    data[i + 2] = r;
    data[i + 3] = 255;
  }
  return { data, width, height };
}

function drawStroke() {
  store().setTool('brush');
  store().pointerDown({ x: 1, y: 1 });
  store().pointerUp({ x: 11, y: 11 });
}

beforeEach(() => {
  store().newDocument({ width: 100, height: 80, name: 'AI test' });
  if (store().aiPanelOpen) store().toggleAiPanel();
});

describe('AI panel visibility', () => {
  it('toggles open and closed', () => {
    expect(store().aiPanelOpen).toBe(false);
    store().toggleAiPanel();
    expect(store().aiPanelOpen).toBe(true);
    store().toggleAiPanel();
    expect(store().aiPanelOpen).toBe(false);
  });
});

describe('AI insert path (Create tab)', () => {
  it('generated pixels land on a new layer, undoably', () => {
    const before = store().doc.layers.length;
    store().importImage(pixels(40, 30), 'a starry night');
    const s = store();
    expect(s.doc.layers.length).toBe(before + 1);
    expect(s.activeLayerId).toBe(s.doc.layers[s.doc.layers.length - 1].id);
    store().undo();
    expect(store().doc.layers.length).toBe(before);
  });
});

describe('AI edit path (Edit tab)', () => {
  it('applyLayerRaster bakes the edited raster with a custom label, undoably', () => {
    drawStroke();
    expect(store().doc.layers[0].operations[0].kind).toBe('stroke');
    store().applyLayerRaster(pixels(100, 80), 'AI edit');
    const ops = store().doc.layers[0].operations;
    expect(ops).toHaveLength(1);
    expect(ops[0].kind).toBe('image');
    store().undo();
    expect(store().doc.layers[0].operations[0].kind).toBe('stroke');
  });
});

describe('AI apply-suggestion path (Feedback tab)', () => {
  it('centerSelection moves the selection to the canvas center, undoably', () => {
    drawStroke();
    const layer = store().doc.layers[0];
    const opId = layer.operations[0].id;
    store().setSelection([opId]);

    const before = selectionUnionBounds(store().doc.layers[0].operations, [opId])!;
    expect(before.x + before.width / 2).not.toBeCloseTo(50, 0);

    store().centerSelection();
    const after = selectionUnionBounds(store().doc.layers[0].operations, [opId])!;
    expect(after.x + after.width / 2).toBeCloseTo(50, 0);
    expect(after.y + after.height / 2).toBeCloseTo(40, 0);

    store().undo();
    const restored = selectionUnionBounds(store().doc.layers[0].operations, [opId])!;
    expect(restored.x).toBeCloseTo(before.x, 0);
    expect(restored.y).toBeCloseTo(before.y, 0);
  });

  it('centerSelection is a no-op with an empty selection', () => {
    drawStroke();
    const before = store().doc;
    store().centerSelection();
    expect(store().doc).toBe(before);
  });
});
