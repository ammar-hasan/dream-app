import { describe, expect, it } from 'vitest';
import { createDocument, createLayer, insertLayer } from './document';
import { renderDocument, renderLayer, renderOperation } from './renderer';
import { MockContext2D, makeMockFactories } from '../test/mockContext';
import type { FillOp, ImageOp, ShapeOp, StrokeOp, TextOp } from './types';

const stroke: StrokeOp = {
  kind: 'stroke',
  id: 's1',
  tool: 'brush',
  points: [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ],
  color: '#ff0000',
  size: 6,
  opacity: 0.5,
};

function docWithStroke() {
  const doc = createDocument({ width: 100, height: 80 });
  return { ...doc, layers: [{ ...doc.layers[0], operations: [stroke] }] };
}

describe('renderDocument', () => {
  it('paints the background then the layers', () => {
    const ctx = new MockContext2D();
    renderDocument(docWithStroke(), ctx);
    const bg = ctx.calls('fillRect')[0];
    expect(bg).toEqual(['fillRect', 0, 0, 100, 80]);
    expect(ctx.calls('stroke')).toHaveLength(1);
  });

  it('skips the background when disabled', () => {
    const ctx = new MockContext2D();
    renderDocument(docWithStroke(), ctx, { background: false });
    expect(ctx.calls('fillRect')).toHaveLength(0);
  });

  it('skips invisible layers', () => {
    const doc = docWithStroke();
    doc.layers[0] = { ...doc.layers[0], visible: false };
    const ctx = new MockContext2D();
    renderDocument(doc, ctx);
    expect(ctx.calls('stroke')).toHaveLength(0);
  });

  it('honors a layer filter', () => {
    const doc = docWithStroke();
    const ctx = new MockContext2D();
    renderDocument(doc, ctx, { layerFilter: () => false });
    expect(ctx.calls('stroke')).toHaveLength(0);
  });

  it('flattens a blended layer before compositing it over the document', () => {
    const doc = docWithStroke();
    doc.layers[0] = { ...doc.layers[0], blendMode: 'multiply' };
    const factories = makeMockFactories();
    const ctx = new MockContext2D();

    renderDocument(doc, ctx, factories);

    expect(factories.created).toHaveLength(1);
    expect(factories.created[0].context.calls('stroke')).toHaveLength(1);
    expect(ctx.calls('stroke')).toHaveLength(0);
    expect(ctx.calls('drawImage')).toEqual([
      ['drawImage', factories.created[0], 0, 0, undefined, undefined],
    ]);
    expect(ctx.globalCompositeOperation).toBe('multiply');
  });
});

describe('stroke rendering', () => {
  it('traces the polyline with the stroke style', () => {
    const ctx = new MockContext2D();
    renderOperation(stroke, ctx);
    expect(ctx.calls('moveTo')).toEqual([['moveTo', 1, 2]]);
    expect(ctx.calls('lineTo')).toEqual([['lineTo', 3, 4]]);
    expect(ctx.strokeStyle).toBe('rgba(255, 0, 0, 1)');
    expect(ctx.lineWidth).toBe(6);
  });

  it('multiplies op and layer opacity', () => {
    const ctx = new MockContext2D();
    renderOperation(stroke, ctx, { layerOpacity: 0.5 });
    expect(ctx.globalAlpha).toBeCloseTo(0.25);
  });

  it('erasers composite with destination-out', () => {
    const ctx = new MockContext2D();
    renderOperation({ ...stroke, tool: 'eraser', opacity: 1 }, ctx);
    expect(ctx.globalCompositeOperation).toBe('destination-out');
  });

  it('ignores empty point lists', () => {
    const ctx = new MockContext2D();
    renderOperation({ ...stroke, points: [] }, ctx);
    expect(ctx.calls('stroke')).toHaveLength(0);
  });
});

describe('shape rendering', () => {
  const base: ShapeOp = {
    kind: 'shape',
    id: 'sh1',
    shape: 'line',
    from: { x: 0, y: 0 },
    to: { x: 10, y: 10 },
    color: '#000000',
    size: 2,
    opacity: 1,
  };

  it('draws lines as a two-point path', () => {
    const ctx = new MockContext2D();
    renderOperation(base, ctx);
    expect(ctx.calls('moveTo')).toEqual([['moveTo', 0, 0]]);
    expect(ctx.calls('lineTo')).toEqual([['lineTo', 10, 10]]);
  });

  it('draws rectangles via rect()', () => {
    const ctx = new MockContext2D();
    renderOperation(
      { ...base, shape: 'rectangle', from: { x: 10, y: 10 }, to: { x: 0, y: 0 } },
      ctx,
    );
    expect(ctx.calls('rect')).toEqual([['rect', 0, 0, 10, 10]]);
  });

  it('draws ellipses via ellipse() with computed radii', () => {
    const ctx = new MockContext2D();
    renderOperation({ ...base, shape: 'ellipse', from: { x: 0, y: 0 }, to: { x: 20, y: 10 } }, ctx);
    expect(ctx.calls('ellipse')).toEqual([['ellipse', 10, 5, 10, 5, 0, 0, Math.PI * 2]]);
  });
});

describe('text rendering', () => {
  it('sets the font and fills the text', () => {
    const op: TextOp = {
      kind: 'text',
      id: 't1',
      position: { x: 5, y: 6 },
      text: 'Hello',
      color: '#123456',
      opacity: 1,
      fontSize: 30,
      fontFamily: 'Georgia, serif',
    };
    const ctx = new MockContext2D();
    renderOperation(op, ctx);
    expect(ctx.font).toBe('30px Georgia, serif');
    expect(ctx.textBaseline).toBe('top');
    expect(ctx.calls('fillText')).toEqual([['fillText', 'Hello', 5, 6]]);
  });
});

describe('fill rendering', () => {
  const patchData = new Uint8ClampedArray([255, 0, 0, 255]);
  const fill: FillOp = {
    kind: 'fill',
    id: 'f1',
    origin: { x: 7, y: 8 },
    color: '#ff0000',
    opacity: 1,
    patch: { x: 7, y: 8, width: 1, height: 1, data: patchData },
  };

  it('rasterizes the patch on a scratch canvas and draws it at the patch origin', () => {
    const { created, createCanvas, createImageData } = makeMockFactories();
    const ctx = new MockContext2D();
    renderOperation(fill, ctx, { createCanvas, createImageData });
    expect(created).toHaveLength(1);
    expect(created[0].width).toBe(1);
    const scratch = created[0].context;
    expect(scratch.calls('putImageData')).toHaveLength(1);
    expect(ctx.calls('drawImage')).toEqual([['drawImage', created[0], 7, 8, 1, 1]]);
  });

  it('image ops draw their patch scaled at the patch origin', () => {
    const image: ImageOp = {
      kind: 'image',
      id: 'im1',
      color: '#000000',
      opacity: 1,
      scale: 2,
      patch: { x: 3, y: 4, width: 5, height: 6, data: new Uint8ClampedArray(5 * 6 * 4) },
    };
    const { created, createCanvas, createImageData } = makeMockFactories();
    const ctx = new MockContext2D();
    renderOperation(image, ctx, { createCanvas, createImageData });
    expect(created[0].width).toBe(5);
    expect(ctx.calls('drawImage')).toEqual([['drawImage', created[0], 3, 4, 10, 12]]);
  });

  it('renderLayer paints every operation in order', () => {
    const layer = createLayer('L', [
      { ...stroke, id: 'a' },
      { ...stroke, id: 'b' },
    ]);
    const ctx = new MockContext2D();
    renderLayer(layer, ctx);
    expect(ctx.calls('stroke')).toHaveLength(2);
  });

  it('fill ops flow through renderDocument with factories', () => {
    const doc = createDocument({ width: 10, height: 10 });
    const withFill = insertLayer(doc, createLayer('Fills', [fill]));
    const { createCanvas, createImageData } = makeMockFactories();
    const ctx = new MockContext2D();
    renderDocument(withFill, ctx, { createCanvas, createImageData });
    expect(ctx.calls('drawImage')).toHaveLength(1);
  });
});

describe('pressure-width stroke rendering', () => {
  const pressured: StrokeOp = {
    ...stroke,
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ],
    widths: [0.2, 0.6, 1],
  };

  /** Mock that also captures the lineWidth in effect at each stroke call. */
  class WidthRecorder extends MockContext2D {
    widths: number[] = [];
    stroke(): void {
      this.widths.push(this.lineWidth);
      super.stroke();
    }
  }

  it('strokes segment by segment with interpolated widths', () => {
    const ctx = new WidthRecorder();
    renderOperation(pressured, ctx);
    // Average of adjacent multipliers × size: (0.2+0.6)/2*6 = 2.4, (0.6+1)/2*6 = 4.8.
    expect(ctx.widths[0]).toBeCloseTo(2.4);
    expect(ctx.widths[1]).toBeCloseTo(4.8);
    expect(ctx.calls('beginPath')).toHaveLength(2);
    expect(ctx.calls('moveTo')).toEqual([
      ['moveTo', 0, 0],
      ['moveTo', 10, 0],
    ]);
  });

  it('uniform strokes (no widths) keep the single-path rendering', () => {
    const ctx = new MockContext2D();
    renderOperation(stroke, ctx);
    expect(ctx.calls('beginPath')).toHaveLength(1);
    expect(ctx.calls('stroke')).toHaveLength(1);
  });

  it('mismatched widths arrays fall back to uniform rendering', () => {
    const ctx = new MockContext2D();
    renderOperation({ ...pressured, widths: [1] }, ctx);
    expect(ctx.calls('stroke')).toHaveLength(1);
  });
});

describe('connector rendering', () => {
  it('draws one or two arrowheads as part of the line path', () => {
    const connector: ShapeOp = {
      kind: 'shape',
      id: 'arrow',
      shape: 'line',
      from: { x: 10, y: 20 },
      to: { x: 80, y: 20 },
      color: '#000000',
      size: 3,
      opacity: 1,
      lineStyle: 'arrow',
    };
    const one = new MockContext2D();
    renderOperation(connector, one);
    expect(one.calls('lineTo')).toHaveLength(3);

    const both = new MockContext2D();
    renderOperation({ ...connector, lineStyle: 'double-arrow' }, both);
    expect(both.calls('lineTo')).toHaveLength(5);
    expect(both.calls('stroke')).toHaveLength(1);
  });
});

describe('spray rendering', () => {
  const spray: StrokeOp = {
    kind: 'stroke',
    id: 'sp1',
    tool: 'spray',
    points: [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
    ],
    color: '#00ff00',
    size: 16,
    opacity: 1,
    seed: 42,
    density: 40,
  };

  it('paints deterministic fillRect dots from the seed', () => {
    const a = new MockContext2D();
    const b = new MockContext2D();
    renderOperation(spray, a);
    renderOperation(spray, b);
    const dots = a.calls('fillRect');
    expect(dots.length).toBeGreaterThan(0);
    expect(b.calls('fillRect')).toEqual(dots);
    expect(a.calls('stroke')).toHaveLength(0);
  });
});

describe('filled shape rendering', () => {
  const filledRect: ShapeOp = {
    kind: 'shape',
    id: 'fr1',
    shape: 'rectangle',
    from: { x: 5, y: 5 },
    to: { x: 25, y: 20 },
    color: '#0000ff',
    size: 4,
    opacity: 1,
    fill: true,
  };

  it('fills instead of stroking when fill is set', () => {
    const ctx = new MockContext2D();
    renderOperation(filledRect, ctx);
    expect(ctx.calls('fill')).toHaveLength(1);
    expect(ctx.calls('stroke')).toHaveLength(0);
    expect(ctx.calls('rect')).toEqual([['rect', 5, 5, 20, 15]]);
    expect(ctx.fillStyle).toBe('rgba(0, 0, 255, 1)');
  });

  it('outline shapes still stroke, never fill', () => {
    const ctx = new MockContext2D();
    renderOperation({ ...filledRect, fill: undefined }, ctx);
    expect(ctx.calls('fill')).toHaveLength(0);
    expect(ctx.calls('stroke')).toHaveLength(1);
  });
});
