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
