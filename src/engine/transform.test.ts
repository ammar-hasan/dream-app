import { describe, expect, it } from 'vitest';
import { createDocument, createLayer, insertLayer } from './document';
import {
  cropDocumentCommand,
  History,
  resizeDocumentCommand,
  transformLayerCommand,
  translateLayerCommand,
} from './history';
import type { PixelBuffer } from './filters';
import {
  clipPatch,
  cropDocument,
  flipBuffer,
  layerContentBounds,
  resizeBufferNearest,
  resizeDocument,
  rotateBuffer90,
  transformLayer,
  translateLayer,
} from './transform';
import type { FillOp, ImageOp, StrokeOp } from './types';

function buffer(pixels: number[], width: number, height: number): PixelBuffer {
  return { data: new Uint8ClampedArray(pixels), width, height };
}

/** 2x1 buffer: pixel A=(10,20,30,255), B=(40,50,60,200). */
const AB = [10, 20, 30, 255, 40, 50, 60, 200];

function imageOp(patch: Partial<ImageOp['patch']> & { data: Uint8ClampedArray }): ImageOp {
  return {
    kind: 'image',
    id: 'im1',
    color: '#000000',
    opacity: 1,
    scale: 1,
    patch: { x: 0, y: 0, width: 1, height: 1, ...patch },
  };
}

function strokeOp(points: { x: number; y: number }[]): StrokeOp {
  return {
    kind: 'stroke',
    id: 's1',
    tool: 'brush',
    color: '#000000',
    opacity: 1,
    size: 2,
    points,
  };
}

describe('buffer transforms', () => {
  it('flip horizontal mirrors columns', () => {
    const out = flipBuffer(buffer(AB, 2, 1), 'horizontal');
    expect([...out.data]).toEqual([40, 50, 60, 200, 10, 20, 30, 255]);
  });

  it('flip vertical mirrors rows', () => {
    const out = flipBuffer(buffer(AB, 1, 2), 'vertical');
    expect([...out.data]).toEqual([40, 50, 60, 200, 10, 20, 30, 255]);
    expect(out.width).toBe(1);
    expect(out.height).toBe(2);
  });

  it('rotate 90° cw swaps dimensions and pixels', () => {
    // 2x1 [A B] -> 1x2 [A; B] (A ends on top for cw)
    const out = rotateBuffer90(buffer(AB, 2, 1), 'cw');
    expect(out.width).toBe(1);
    expect(out.height).toBe(2);
    expect([...out.data]).toEqual(AB);
  });

  it('rotate 90° ccw reverses the order', () => {
    const out = rotateBuffer90(buffer(AB, 2, 1), 'ccw');
    expect([...out.data]).toEqual([40, 50, 60, 200, 10, 20, 30, 255]);
  });

  it('cw then ccw round-trips', () => {
    const src = buffer(AB, 2, 1);
    expect([...rotateBuffer90(rotateBuffer90(src, 'cw'), 'ccw').data]).toEqual(AB);
  });

  it('nearest resize duplicates pixels when scaling up', () => {
    const out = resizeBufferNearest(buffer(AB, 2, 1), 4, 2);
    expect(out.width).toBe(4);
    expect(out.height).toBe(2);
    expect([...out.data.slice(0, 8)]).toEqual([10, 20, 30, 255, 10, 20, 30, 255]);
    expect([...out.data.slice(8, 16)]).toEqual([40, 50, 60, 200, 40, 50, 60, 200]);
  });

  it('nearest resize picks the top-left pixel when shrinking to 1x1', () => {
    const out = resizeBufferNearest(buffer(AB, 2, 1), 1, 1);
    expect([...out.data]).toEqual([10, 20, 30, 255]);
  });
});

describe('layer translate & transform', () => {
  it('translateLayer shifts strokes and image patches', () => {
    let doc = createDocument({ width: 10, height: 10 });
    doc = insertLayer(
      doc,
      createLayer('L', [
        strokeOp([{ x: 1, y: 1 }]),
        imageOp({ data: new Uint8ClampedArray(4), x: 2, y: 3 }),
      ]),
    );
    const layer = doc.layers[1];
    const moved = translateLayer(doc, layer.id, 5, -1).layers[1];
    const stroke = moved.operations[0] as StrokeOp;
    const image = moved.operations[1] as ImageOp;
    expect(stroke.points[0]).toEqual({ x: 6, y: 0 });
    expect([image.patch.x, image.patch.y]).toEqual([7, 2]);
    // original untouched (immutability)
    expect((doc.layers[1].operations[1] as ImageOp).patch.x).toBe(2);
  });

  it('layerContentBounds unions operation extents', () => {
    const layer = createLayer('L', [
      strokeOp([
        { x: 1, y: 1 },
        { x: 5, y: 2 },
      ]),
      imageOp({ data: new Uint8ClampedArray(4), x: 10, y: 10 }),
    ]);
    expect(layerContentBounds(layer)).toEqual({ x: 1, y: 1, width: 10, height: 10 });
    expect(layerContentBounds(createLayer('empty'))).toBeNull();
  });

  it('flip-horizontal flips a single image in place', () => {
    let doc = createDocument({ width: 4, height: 4 });
    doc = insertLayer(
      doc,
      createLayer('L', [imageOp({ data: new Uint8ClampedArray(AB), width: 2, height: 1 })]),
    );
    const flipped = transformLayer(doc, doc.layers[1].id, 'flip-horizontal');
    const op = flipped.layers[1].operations[0] as ImageOp;
    expect([op.patch.x, op.patch.y]).toEqual([0, 0]); // content bbox centered: stays put
    expect([...op.patch.data]).toEqual([40, 50, 60, 200, 10, 20, 30, 255]);
  });

  it('rotate-cw on a 2x2 image keeps the center and rotates pixels', () => {
    // A B / C D  ->  C A / D B
    const pixels = [1, 0, 0, 255, 2, 0, 0, 255, 3, 0, 0, 255, 4, 0, 0, 255];
    let doc = createDocument({ width: 4, height: 4 });
    doc = insertLayer(
      doc,
      createLayer('L', [imageOp({ data: new Uint8ClampedArray(pixels), width: 2, height: 2 })]),
    );
    const rotated = transformLayer(doc, doc.layers[1].id, 'rotate-cw');
    const op = rotated.layers[1].operations[0] as ImageOp;
    expect([op.patch.x, op.patch.y]).toEqual([0, 0]);
    const reds = [...op.patch.data].filter((_, i) => i % 4 === 0);
    expect(reds).toEqual([3, 1, 4, 2]);
  });

  it('transformLayer is a no-op on empty layers', () => {
    let doc = createDocument({ width: 4, height: 4 });
    doc = insertLayer(doc, createLayer('empty'));
    const out = transformLayer(doc, doc.layers[1].id, 'flip-horizontal');
    expect(out.layers[1]).toBe(doc.layers[1]);
  });

  it('flip-vertical and rotate-ccw transform image patches in place', () => {
    let doc = createDocument({ width: 4, height: 4 });
    doc = insertLayer(
      doc,
      createLayer('L', [imageOp({ data: new Uint8ClampedArray(AB), width: 1, height: 2 })]),
    );
    const layerId = doc.layers[1].id;
    const flipped = transformLayer(doc, layerId, 'flip-vertical');
    const fop = flipped.layers[1].operations[0] as ImageOp;
    expect([fop.patch.x, fop.patch.y]).toEqual([0, 0]);
    expect([...fop.patch.data]).toEqual([40, 50, 60, 200, 10, 20, 30, 255]);

    const rotated = transformLayer(doc, layerId, 'rotate-ccw');
    const rop = rotated.layers[1].operations[0] as ImageOp;
    expect([rop.patch.width, rop.patch.height]).toEqual([2, 1]);
    expect([rop.patch.x + 0, rop.patch.y]).toEqual([0, 1]); // +0 normalizes -0
    expect([...rop.patch.data]).toEqual(AB);
  });

  it('transforms strokes, shapes, text and fills around the content center', () => {
    const fill: FillOp = {
      kind: 'fill',
      id: 'f1',
      origin: { x: 0, y: 0 },
      color: '#ff0000',
      opacity: 1,
      patch: { x: 0, y: 0, width: 2, height: 2, data: new Uint8ClampedArray(16).fill(9) },
    };
    let doc = createDocument({ width: 4, height: 4 });
    doc = insertLayer(
      doc,
      createLayer('L', [
        strokeOp([
          { x: 0, y: 0 },
          { x: 2, y: 2 },
        ]),
        {
          kind: 'shape',
          id: 'sh1',
          shape: 'line',
          color: '#000000',
          opacity: 1,
          size: 1,
          from: { x: 0, y: 0 },
          to: { x: 2, y: 2 },
        },
        {
          kind: 'text',
          id: 't1',
          position: { x: 0, y: 0 },
          text: 'hi',
          color: '#000000',
          opacity: 1,
          fontSize: 10,
          fontFamily: 'sans-serif',
        },
        fill,
      ]),
    );
    // Content bbox is the 2x2 square at the origin -> center (1, 1).
    const out = transformLayer(doc, doc.layers[1].id, 'flip-horizontal');
    const ops = out.layers[1].operations;
    expect((ops[0] as StrokeOp).points).toEqual([
      { x: 2, y: 0 },
      { x: 0, y: 2 },
    ]);
    expect((ops[1] as { from: { x: number } }).from.x).toBe(2);
    expect((ops[2] as { position: { x: number } }).position.x).toBe(2);
    expect((ops[3] as FillOp).patch.x).toBe(0); // symmetric fill stays put
  });

  it('crop keeps scaled image ops (translated, pixels untouched)', () => {
    let doc = createDocument({ width: 10, height: 10 });
    doc = insertLayer(
      doc,
      createLayer('L', [
        {
          ...imageOp({ data: new Uint8ClampedArray(AB), width: 2, height: 1, x: 6, y: 6 }),
          scale: 2,
        },
      ]),
    );
    const cropped = cropDocument(doc, { x: 1, y: 1, width: 8, height: 8 });
    const op = cropped.layers[1].operations[0] as ImageOp;
    expect(op.scale).toBe(2);
    expect([op.patch.x, op.patch.y]).toEqual([5, 5]);
    expect([...op.patch.data]).toEqual(AB);
  });

  it('transform commands undo via the inverse transform', () => {
    const history = new History();
    let doc = createDocument({ width: 4, height: 4 });
    doc = insertLayer(
      doc,
      createLayer('L', [imageOp({ data: new Uint8ClampedArray(AB), width: 2, height: 1 })]),
    );
    const layerId = doc.layers[1].id;
    const flipped = history.execute(doc, transformLayerCommand(layerId, 'flip-horizontal'));
    const restored = history.undo(flipped);
    expect(restored.layers[1].operations[0]).toEqual(doc.layers[1].operations[0]);
  });

  it('translate commands undo by shifting back', () => {
    const history = new History();
    let doc = createDocument({ width: 10, height: 10 });
    doc = insertLayer(
      doc,
      createLayer('L', [imageOp({ data: new Uint8ClampedArray(4), x: 1, y: 1 })]),
    );
    const layerId = doc.layers[1].id;
    const moved = history.execute(doc, translateLayerCommand(layerId, 3, 4));
    expect((moved.layers[1].operations[0] as ImageOp).patch.x).toBe(4);
    const restored = history.undo(moved);
    expect((restored.layers[1].operations[0] as ImageOp).patch.x).toBe(1);
  });
});

describe('crop', () => {
  it('clipPatch extracts the intersection', () => {
    const patch = {
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([1, 0, 0, 255, 2, 0, 0, 255, 3, 0, 0, 255, 4, 0, 0, 255]),
    };
    const clipped = clipPatch(patch, { x: 1, y: 1, width: 5, height: 5 });
    expect(clipped).toMatchObject({ x: 1, y: 1, width: 1, height: 1 });
    expect([...clipped!.data]).toEqual([4, 0, 0, 255]);
    expect(clipPatch(patch, { x: 5, y: 5, width: 2, height: 2 })).toBeNull();
  });

  it('cropDocument resizes the doc, shifts ops and clips raster patches', () => {
    const fill: FillOp = {
      kind: 'fill',
      id: 'f1',
      origin: { x: 1, y: 1 },
      color: '#ff0000',
      opacity: 1,
      patch: {
        x: 0,
        y: 0,
        width: 2,
        height: 2,
        data: new Uint8ClampedArray([1, 0, 0, 255, 2, 0, 0, 255, 3, 0, 0, 255, 4, 0, 0, 255]),
      },
    };
    let doc = createDocument({ width: 4, height: 4 });
    doc = insertLayer(
      doc,
      createLayer('L', [
        strokeOp([{ x: 2, y: 2 }]),
        fill,
        imageOp({ data: new Uint8ClampedArray(4), x: 9, y: 9 }),
      ]),
    );
    const cropped = cropDocument(doc, { x: 1, y: 1, width: 2, height: 2 });
    expect([cropped.width, cropped.height]).toEqual([2, 2]);
    const ops = cropped.layers[1].operations;
    // image op sat fully outside the crop -> dropped
    expect(ops).toHaveLength(2);
    expect((ops[0] as StrokeOp).points[0]).toEqual({ x: 1, y: 1 });
    const croppedFill = ops[1] as FillOp;
    expect(croppedFill.patch).toMatchObject({ x: 0, y: 0, width: 1, height: 1 });
    expect([...croppedFill.patch.data]).toEqual([4, 0, 0, 255]);
  });

  it('crop command undo restores size and layers exactly', () => {
    const history = new History();
    let doc = createDocument({ width: 4, height: 4 });
    doc = insertLayer(doc, createLayer('L', [strokeOp([{ x: 3, y: 3 }])]));
    const cropped = history.execute(
      doc,
      cropDocumentCommand(doc, { x: 1, y: 1, width: 2, height: 2 }),
    );
    expect(cropped.width).toBe(2);
    const restored = history.undo(cropped);
    expect(restored.width).toBe(4);
    expect(restored.layers).toEqual(doc.layers);
  });
});

describe('resize', () => {
  it('scales points, sizes and raster patches to fit', () => {
    let doc = createDocument({ width: 2, height: 2 });
    doc = insertLayer(
      doc,
      createLayer('L', [
        strokeOp([{ x: 1, y: 1 }]),
        imageOp({ data: new Uint8ClampedArray(AB), width: 2, height: 1, x: 0, y: 1 }),
      ]),
    );
    const resized = resizeDocument(doc, 4, 4);
    expect([resized.width, resized.height]).toEqual([4, 4]);
    const stroke = resized.layers[1].operations[0] as StrokeOp;
    expect(stroke.points[0]).toEqual({ x: 2, y: 2 });
    expect(stroke.size).toBe(4);
    const image = resized.layers[1].operations[1] as ImageOp;
    expect([image.patch.width, image.patch.height]).toEqual([4, 2]);
    expect([image.patch.x, image.patch.y]).toEqual([0, 2]);
    expect([...image.patch.data.slice(0, 8)]).toEqual([10, 20, 30, 255, 10, 20, 30, 255]);
  });

  it('resize command undo restores the original document', () => {
    const history = new History();
    let doc = createDocument({ width: 2, height: 2 });
    doc = insertLayer(
      doc,
      createLayer('L', [imageOp({ data: new Uint8ClampedArray(AB), width: 2, height: 1 })]),
    );
    const resized = history.execute(doc, resizeDocumentCommand(doc, 4, 4));
    const restored = history.undo(resized);
    expect(restored.width).toBe(2);
    expect(restored.layers).toEqual(doc.layers);
  });
});
