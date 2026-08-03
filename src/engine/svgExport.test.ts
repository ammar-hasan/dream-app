import { describe, expect, it } from 'vitest';
import { createDocument } from './document';
import { buildSvg, canExportSvg } from './svgExport';
import type { DreamDocument, Operation } from './types';

function withOps(operations: Operation[]): DreamDocument {
  const doc = createDocument({ width: 320, height: 180, name: 'Lab & logo' });
  return { ...doc, layers: [{ ...doc.layers[0], operations }] };
}

describe('SVG export', () => {
  it('preserves vector geometry, pressure, connector ends, text and escaping', () => {
    const doc = withOps([
      {
        kind: 'shape',
        id: 'arrow',
        shape: 'line',
        from: { x: 10, y: 20 },
        to: { x: 90, y: 20 },
        color: '#112233',
        size: 3,
        opacity: 0.8,
        lineStyle: 'double-arrow',
      },
      {
        kind: 'stroke',
        id: 'nib',
        tool: 'brush',
        points: [
          { x: 10, y: 40 },
          { x: 30, y: 60 },
        ],
        widths: [0.2, 1],
        color: '#445566',
        size: 10,
        opacity: 1,
      },
      {
        kind: 'text',
        id: 'label',
        position: { x: 12, y: 80 },
        text: 'H₂O < 3 & safe',
        fontSize: 24,
        fontFamily: 'Georgia, "serif"',
        color: '#000000',
        opacity: 1,
      },
    ]);
    const svg = buildSvg(doc);
    expect(svg).toContain('viewBox="0 0 320 180"');
    expect(svg).toContain('<title>Lab &amp; logo</title>');
    expect(svg).toContain('stroke-width="6"');
    expect(svg).toContain('<path d="M 90 20');
    expect(svg).toContain('H₂O &lt; 3 &amp; safe');
    expect(svg).toContain('Georgia, &quot;serif&quot;');
  });

  it('exports shapes and deterministic spray as vector elements', () => {
    const doc = withOps([
      {
        kind: 'shape',
        id: 'box',
        shape: 'rectangle',
        from: { x: 40, y: 30 },
        to: { x: 10, y: 5 },
        color: '#ff0000',
        size: 2,
        opacity: 1,
        fill: true,
      },
      {
        kind: 'stroke',
        id: 'spray',
        tool: 'spray',
        points: [{ x: 5, y: 5 }],
        color: '#00ff00',
        size: 8,
        opacity: 0.5,
        seed: 2,
        density: 10,
      },
    ]);
    const svg = buildSvg(doc);
    expect(svg).toContain('<rect x="10" y="5" width="30" height="25" fill="#ff0000"');
    expect(svg.match(/<rect /g)?.length).toBeGreaterThan(2);
  });

  it('preserves a vector layer blend mode', () => {
    const doc = withOps([
      {
        kind: 'shape',
        id: 'box',
        shape: 'rectangle',
        from: { x: 0, y: 0 },
        to: { x: 20, y: 20 },
        color: '#ff0000',
        size: 2,
        opacity: 1,
        fill: true,
      },
    ]);
    doc.layers[0] = { ...doc.layers[0], blendMode: 'overlay' };

    expect(buildSvg(doc)).toContain('style="mix-blend-mode:overlay"');
  });

  it('refuses a visible layer whose editable adjustments require raster pixels', () => {
    const doc = withOps([]);
    doc.layers[0] = {
      ...doc.layers[0],
      adjustments: { ...doc.layers[0].adjustments!, brightness: 20 },
    };
    expect(canExportSvg(doc)).toBe(false);
    expect(() => buildSvg(doc)).toThrow(/vector-safe/);
  });

  it('refuses visible pixel content or erasers but ignores hidden unsupported layers', () => {
    const fill: Operation = {
      kind: 'fill',
      id: 'pixels',
      origin: { x: 0, y: 0 },
      color: '#000000',
      opacity: 1,
      patch: { x: 0, y: 0, width: 1, height: 1, data: new Uint8ClampedArray(4) },
    };
    const doc = withOps([fill]);
    expect(canExportSvg(doc)).toBe(false);
    expect(() => buildSvg(doc)).toThrow(/vector-safe/);
    expect(canExportSvg({ ...doc, layers: [{ ...doc.layers[0], visible: false }] })).toBe(true);

    const eraser: Operation = {
      kind: 'stroke',
      id: 'erase',
      tool: 'eraser',
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      color: '#000000',
      size: 4,
      opacity: 1,
    };
    expect(canExportSvg(withOps([eraser]))).toBe(false);
  });
});
