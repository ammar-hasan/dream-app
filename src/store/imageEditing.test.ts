import { beforeEach, describe, expect, it } from 'vitest';
import { useDreamStore } from './dreamStore';
import { DEFAULT_ADJUSTMENTS, type PixelBuffer } from '../engine/filters';
import type { ImageOp } from '../engine/types';

const store = () => useDreamStore.getState();

function image(width: number, height: number, fill = 128): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4).fill(fill);
  return { data, width, height };
}

beforeEach(() => {
  store().newDocument({ width: 100, height: 80, name: 'Test' });
});

describe('image import', () => {
  it('places the image centered on a new, selected layer', () => {
    store().importImage(image(10, 10), 'photo');
    const s = store();
    expect(s.doc.layers).toHaveLength(2);
    const layer = s.doc.layers[1];
    expect(s.activeLayerId).toBe(layer.id);
    expect(layer.name).toBe('photo');
    const op = layer.operations[0] as ImageOp;
    expect(op.kind).toBe('image');
    expect(op.scale).toBe(1);
    expect([op.patch.x, op.patch.y]).toEqual([45, 35]);
  });

  it('scales oversized images down to fit the document', () => {
    store().importImage(image(200, 160));
    const op = store().doc.layers[1].operations[0] as ImageOp;
    expect(op.scale).toBe(0.5);
    expect([op.patch.x, op.patch.y]).toEqual([0, 0]);
  });

  it('is undoable', () => {
    store().importImage(image(10, 10));
    store().undo();
    expect(store().doc.layers).toHaveLength(1);
    store().redo();
    expect(store().doc.layers).toHaveLength(2);
  });

  it('rejects empty buffers', () => {
    store().importImage(image(0, 0));
    expect(store().doc.layers).toHaveLength(1);
  });
});

describe('move tool', () => {
  it('drags the active layer content and commits on pointer up', () => {
    store().importImage(image(10, 10));
    store().setTool('move');
    store().pointerDown({ x: 50, y: 40 });
    store().pointerMove({ x: 55, y: 45 });
    expect(store().moveDraft?.delta).toEqual({ x: 5, y: 5 });
    store().pointerUp({ x: 55, y: 45 });
    expect(store().moveDraft).toBeNull();
    const op = store().doc.layers[1].operations[0] as ImageOp;
    expect([op.patch.x, op.patch.y]).toEqual([50, 40]);
    store().undo();
    const restored = store().doc.layers[1].operations[0] as ImageOp;
    expect([restored.patch.x, restored.patch.y]).toEqual([45, 35]);
  });

  it('a click without drag commits nothing', () => {
    store().importImage(image(10, 10));
    store().setTool('move');
    store().pointerDown({ x: 50, y: 40 });
    store().pointerUp({ x: 50, y: 40 });
    expect(store().canUndo).toBe(true); // only the import is on the stack
    store().undo();
    expect(store().doc.layers).toHaveLength(1);
  });
});

describe('filter apply / cancel', () => {
  it('stores editable layer adjustments without replacing marks and undoes them independently', () => {
    store().importImage(image(10, 10));
    const layerId = store().activeLayerId;
    const operations = store().doc.layers[1].operations;
    store().setLayerAdjustments(layerId, { ...DEFAULT_ADJUSTMENTS, grayscale: 100 });

    expect(store().doc.layers[1].operations).toBe(operations);
    expect(store().doc.layers[1].adjustments?.grayscale).toBe(100);
    store().undo();
    expect(store().doc.layers[1].operations).toBe(operations);
    expect(store().doc.layers[1].adjustments?.grayscale).toBe(0);
  });

  it('applyLayerRaster bakes the preview into one image op, undoable', () => {
    store().importImage(image(10, 10));
    const layerId = store().activeLayerId;
    const before = store().doc.layers[1].operations;
    const baked: PixelBuffer = {
      data: new Uint8ClampedArray(100 * 80 * 4).fill(7),
      width: 100,
      height: 80,
    };
    store().applyLayerRaster(baked);
    const ops = store().doc.layers[1].operations;
    expect(ops).toHaveLength(1);
    expect(ops[0].kind).toBe('image');
    expect((ops[0] as ImageOp).patch).toMatchObject({ x: 0, y: 0, width: 100, height: 80 });
    store().undo();
    expect(store().doc.layers.find((l) => l.id === layerId)?.operations).toEqual(before);
  });

  it('setAdjustPreview drives a live preview that cancel clears without history', () => {
    store().importImage(image(10, 10));
    const depth = store().doc.layers.length;
    store().setAdjustPreview({
      layerId: store().activeLayerId,
      adjustments: { ...DEFAULT_ADJUSTMENTS, contrast: 20 },
    });
    expect(store().adjustPreview).not.toBeNull();
    store().setAdjustPreview(null); // Cancel
    expect(store().adjustPreview).toBeNull();
    expect(store().doc.layers).toHaveLength(depth);
    expect(store().doc.layers[1].operations).toHaveLength(1);
  });

  it('applyLayerRaster clears the preview', () => {
    store().importImage(image(10, 10));
    store().setAdjustPreview({
      layerId: store().activeLayerId,
      adjustments: { ...DEFAULT_ADJUSTMENTS, contrast: 20 },
    });
    store().applyLayerRaster(image(100, 80));
    expect(store().adjustPreview).toBeNull();
  });

  it('does not bake onto a locked layer', () => {
    store().importImage(image(10, 10));
    store().setLayerLocked(store().activeLayerId, true);
    store().applyLayerRaster(image(100, 80));
    const ops = store().doc.layers[1].operations;
    expect(ops[0].kind).toBe('image');
    expect((ops[0] as ImageOp).patch.width).toBe(10); // unchanged import
  });
});

describe('flip / rotate', () => {
  it('flipLayer mirrors the active layer, undoable', () => {
    const buf: PixelBuffer = {
      data: new Uint8ClampedArray([1, 0, 0, 255, 2, 0, 0, 255]),
      width: 2,
      height: 1,
    };
    store().importImage(buf);
    store().flipLayer('horizontal');
    let op = store().doc.layers[1].operations[0] as ImageOp;
    expect([...op.patch.data.slice(0, 8)]).toEqual([2, 0, 0, 255, 1, 0, 0, 255]);
    store().undo();
    op = store().doc.layers[1].operations[0] as ImageOp;
    expect([...op.patch.data.slice(0, 8)]).toEqual([1, 0, 0, 255, 2, 0, 0, 255]);
  });

  it('rotateLayer swaps the patch dimensions', () => {
    store().importImage(image(10, 20));
    store().rotateLayer('cw');
    const op = store().doc.layers[1].operations[0] as ImageOp;
    expect([op.patch.width, op.patch.height]).toEqual([20, 10]);
  });
});

describe('crop', () => {
  it('drag a rect, applyCrop shrinks the document (undoable)', () => {
    store().setTool('crop');
    store().pointerDown({ x: 10, y: 10 });
    store().pointerMove({ x: 60, y: 50 });
    store().pointerUp({ x: 60, y: 50 });
    expect(store().cropDraft).not.toBeNull();
    store().applyCrop();
    const s = store();
    expect([s.doc.width, s.doc.height]).toEqual([50, 40]);
    expect(s.cropDraft).toBeNull();
    store().undo();
    expect([store().doc.width, store().doc.height]).toEqual([100, 80]);
  });

  it('a full-document selection crops nothing', () => {
    store().setTool('crop');
    store().pointerDown({ x: 0, y: 0 });
    store().pointerUp({ x: 100, y: 80 });
    store().applyCrop();
    expect([store().doc.width, store().doc.height]).toEqual([100, 80]);
    expect(store().canUndo).toBe(false);
  });

  it('a placed crop selection does not follow the mouse', () => {
    store().setTool('crop');
    store().pointerDown({ x: 10, y: 10 });
    store().pointerUp({ x: 60, y: 50 });
    store().pointerMove({ x: 90, y: 90 }); // hover after drag ends
    expect(store().cropDraft?.to).toEqual({ x: 60, y: 50 });
  });

  it('cancelCrop discards the selection', () => {
    store().setTool('crop');
    store().pointerDown({ x: 5, y: 5 });
    store().pointerUp({ x: 30, y: 30 });
    store().cancelCrop();
    expect(store().cropDraft).toBeNull();
    expect([store().doc.width, store().doc.height]).toEqual([100, 80]);
  });
});

describe('resize document', () => {
  it('scales the document and its content, undoable', () => {
    store().importImage(image(10, 10)); // centered at 45,35
    store().resizeDocument(50, 40);
    const s = store();
    expect([s.doc.width, s.doc.height]).toEqual([50, 40]);
    const op = s.doc.layers[1].operations[0] as ImageOp;
    expect([op.patch.x, op.patch.y]).toEqual([23, 18]); // round(45/2), round(35/2)
    expect([op.patch.width, op.patch.height]).toEqual([5, 5]);
    store().undo();
    expect([store().doc.width, store().doc.height]).toEqual([100, 80]);
    const restored = store().doc.layers[1].operations[0] as ImageOp;
    expect([restored.patch.x, restored.patch.y]).toEqual([45, 35]);
  });

  it('a same-size resize is a no-op', () => {
    store().resizeDocument(100, 80);
    expect(store().canUndo).toBe(false);
  });
});
