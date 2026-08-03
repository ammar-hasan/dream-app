/**
 * Store integration for the drawing power tools: mirror/symmetry commits,
 * pressure, filled shapes, spray, lasso selection and the magic wand.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useDreamStore } from './dreamStore';
import type { ImageOp, ShapeOp, StrokeOp } from '../engine/types';
import type { RasterSource } from '../engine/tools';

const store = () => useDreamStore.getState();

beforeEach(() => {
  store().newDocument({ width: 100, height: 80, name: 'Test' });
  store().setSymmetry('off');
  store().setFillShapes(false);
  store().setBrushStyle('round');
});

function drawStroke(from = { x: 1, y: 1 }, to = { x: 10, y: 10 }) {
  store().setTool('brush');
  store().pointerDown(from);
  store().pointerMove(to);
  store().pointerUp(to);
}

describe('symmetry / mirror mode', () => {
  it('vertical mirror commits original + reflection as ONE undoable command', () => {
    store().setSymmetry('vertical');
    store().setTool('brush');
    store().pointerDown({ x: 10, y: 10 });
    store().pointerMove({ x: 20, y: 20 });
    store().pointerUp({ x: 20, y: 20 });

    const ops = store().doc.layers[0].operations as StrokeOp[];
    expect(ops).toHaveLength(2);
    expect(ops[1].points[0]).toEqual({ x: 90, y: 10 }); // 100 - 10
    expect(ops[1].id).not.toBe(ops[0].id);

    store().undo();
    expect(store().doc.layers[0].operations).toHaveLength(0);
    store().redo();
    expect(store().doc.layers[0].operations).toHaveLength(2);
  });

  it('quad mirror blooms one gesture into four ops', () => {
    store().setSymmetry('quad');
    drawStroke();
    expect(store().doc.layers[0].operations).toHaveLength(4);
    store().undo();
    expect(store().doc.layers[0].operations).toHaveLength(0);
  });

  it('mirrors shapes too', () => {
    store().setSymmetry('horizontal');
    store().setTool('rectangle');
    store().pointerDown({ x: 10, y: 10 });
    store().pointerUp({ x: 30, y: 20 });
    const ops = store().doc.layers[0].operations as ShapeOp[];
    expect(ops).toHaveLength(2);
    expect(ops[1].from).toEqual({ x: 10, y: 70 }); // 80 - 10
    expect(ops[1].to).toEqual({ x: 30, y: 60 });
  });

  it('off commits exactly one op, as before', () => {
    drawStroke();
    expect(store().doc.layers[0].operations).toHaveLength(1);
  });
});

describe('pressure sensitivity', () => {
  it('pen pressure lands on the committed op as per-point widths', () => {
    store().setTool('brush');
    store().pointerDown({ x: 1, y: 1 }, { pressure: 0.5 });
    store().pointerMove({ x: 9, y: 9 }, { pressure: 1 });
    store().pointerUp({ x: 9, y: 9 });
    const op = store().doc.layers[0].operations[0] as StrokeOp;
    // Down + move + the final point pointerUp adds → three samples.
    expect(op.widths).toEqual([0.5, 1, 1]);
  });

  it('mouse gestures produce no widths (uniform rendering)', () => {
    drawStroke();
    const op = store().doc.layers[0].operations[0] as StrokeOp;
    expect(op.widths).toBeUndefined();
  });
});

describe('calligraphy brush', () => {
  it('commits directional widths as one normal undoable stroke', () => {
    store().setBrushStyle('calligraphy');
    drawStroke({ x: 5, y: 25 }, { x: 25, y: 5 });
    const op = store().doc.layers[0].operations[0] as StrokeOp;
    expect(op.widths?.every((width) => width > 0.9)).toBe(true);
    store().undo();
    expect(store().doc.layers[0].operations).toHaveLength(0);
  });
});

describe('filled shapes', () => {
  it('the fill toggle is baked into the committed op', () => {
    store().setFillShapes(true);
    store().setTool('ellipse');
    store().pointerDown({ x: 5, y: 5 });
    store().pointerUp({ x: 25, y: 25 });
    const op = store().doc.layers[0].operations[0] as ShapeOp;
    expect(op.fill).toBe(true);
  });
});

describe('spray', () => {
  it('commits a spray stroke with seed and density', () => {
    store().setDensity(80);
    store().setTool('spray');
    store().pointerDown({ x: 5, y: 5 });
    store().pointerMove({ x: 30, y: 5 });
    store().pointerUp({ x: 30, y: 5 });
    const op = store().doc.layers[0].operations[0] as StrokeOp;
    expect(op.tool).toBe('spray');
    expect(typeof op.seed).toBe('number');
    expect(op.density).toBe(80);
  });
});

describe('lasso select', () => {
  it('a loop selects the ops whose center falls inside', () => {
    drawStroke({ x: 10, y: 10 }, { x: 20, y: 10 }); // left stroke
    drawStroke({ x: 80, y: 10 }, { x: 90, y: 10 }); // right stroke
    store().setMode('design');
    store().setTool('lasso');

    store().pointerDown({ x: 0, y: 0 });
    store().pointerMove({ x: 40, y: 0 });
    store().pointerMove({ x: 40, y: 40 });
    store().pointerMove({ x: 0, y: 40 });
    store().pointerUp({ x: 0, y: 0 });

    const s = store();
    const leftId = s.doc.layers[0].operations[0].id;
    expect(s.selection).toEqual([leftId]);
    expect(s.lassoDraft).toBeNull();
  });

  it('a degenerate loop selects nothing', () => {
    drawStroke();
    store().setMode('design');
    store().setTool('lasso');
    store().pointerDown({ x: 5, y: 5 });
    store().pointerUp({ x: 5, y: 5 });
    expect(store().selection).toEqual([]);
  });
});

// --- Magic wand ---------------------------------------------------------------

/** 100×80 raster with a 4×4 red block at (10..13, 10..13). */
function wandRaster(): RasterSource {
  const data = new Uint8ClampedArray(100 * 80 * 4);
  for (let y = 10; y <= 13; y += 1) {
    for (let x = 10; x <= 13; x += 1) {
      const i = (y * 100 + x) * 4;
      data[i] = 255;
      data[i + 3] = 255;
    }
  }
  return { data, width: 100, height: 80 };
}

const alphaAt = (op: ImageOp, x: number, y: number) =>
  op.patch.data[(y * op.patch.width + x) * 4 + 3];

describe('magic wand', () => {
  it('clicking a region lifts it into a floating draft', () => {
    store().applyWandAt({ x: 11, y: 11 }, wandRaster());
    const draft = store().wandDraft;
    expect(draft).not.toBeNull();
    expect(draft!.patch).toMatchObject({ x: 10, y: 10, width: 4, height: 4 });
    // The document itself is untouched while the region floats.
    expect(store().doc.layers[0].operations).toHaveLength(0);
  });

  it('clicking another region replaces the draft without committing', () => {
    store().applyWandAt({ x: 11, y: 11 }, wandRaster());
    store().applyWandAt({ x: 50, y: 50 }, wandRaster());
    const draft = store().wandDraft;
    // The transparent surroundings are a contiguous region too — the draft
    // now holds them (full-canvas bounds), still without any history entry.
    expect(draft).not.toBeNull();
    expect(draft!.patch.width).toBe(100);
    expect(store().canUndo).toBe(false);
  });

  it('Delete bakes the layer minus the region — one undoable command', () => {
    store().applyWandAt({ x: 11, y: 11 }, wandRaster());
    store().deleteWandRegion();
    const ops = store().doc.layers[0].operations;
    expect(ops).toHaveLength(1);
    expect(ops[0].kind).toBe('image');
    expect(alphaAt(ops[0] as ImageOp, 11, 11)).toBe(0); // region erased
    expect(store().wandDraft).toBeNull();
    store().undo();
    expect(store().doc.layers[0].operations).toHaveLength(0);
  });

  it('copy-to-new-layer keeps the original and adds the patch on its own layer', () => {
    store().applyWandAt({ x: 11, y: 11 }, wandRaster());
    store().copyWandToLayer();
    const s = store();
    expect(s.doc.layers).toHaveLength(2);
    expect(s.doc.layers[0].operations).toHaveLength(0); // original untouched
    const op = s.doc.layers[1].operations[0] as ImageOp;
    expect(op.kind).toBe('image');
    expect(op.patch).toMatchObject({ x: 10, y: 10, width: 4, height: 4 });
    expect(s.activeLayerId).toBe(s.doc.layers[1].id);
    expect(s.wandDraft).toBeNull();
  });

  it('drag moves the region; switching tools bakes it at the new offset', () => {
    store().applyWandAt({ x: 11, y: 11 }, wandRaster());
    expect(store().beginWandDrag({ x: 11, y: 11 })).toBe(true);
    store().pointerMove({ x: 21, y: 31 });
    store().pointerUp({ x: 21, y: 31 });
    expect(store().wandDraft!.offset).toEqual({ x: 10, y: 20 });
    // Still floating — the document is untouched until commit.
    expect(store().doc.layers[0].operations).toHaveLength(0);

    store().setTool('pencil'); // commits the move
    const ops = store().doc.layers[0].operations;
    expect(ops).toHaveLength(1);
    const op = ops[0] as ImageOp;
    expect(alphaAt(op, 21, 31)).toBe(255); // region landed at the offset
    expect(alphaAt(op, 11, 11)).toBe(0); // origin is empty
    store().undo();
    expect(store().doc.layers[0].operations).toHaveLength(0);
  });

  it('beginWandDrag outside the floating region returns false', () => {
    store().applyWandAt({ x: 11, y: 11 }, wandRaster());
    expect(store().beginWandDrag({ x: 60, y: 60 })).toBe(false);
  });

  it('cancelWand discards the draft, restoring the layer as it was', () => {
    store().applyWandAt({ x: 11, y: 11 }, wandRaster());
    store().cancelWand();
    expect(store().wandDraft).toBeNull();
    expect(store().doc.layers[0].operations).toHaveLength(0);
    expect(store().canUndo).toBe(false);
  });

  it('the tolerance setter clamps to 0..255', () => {
    store().setWandTolerance(999);
    expect(store().wandTolerance).toBe(255);
    store().setWandTolerance(-5);
    expect(store().wandTolerance).toBe(0);
  });
});
