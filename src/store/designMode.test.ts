import { beforeEach, describe, expect, it } from 'vitest';
import { useDreamStore } from './dreamStore';
import type { ShapeOp, StrokeOp } from '../engine/types';
import { selectionUnionBounds } from '../engine/selection';

const store = () => useDreamStore.getState();

/** Draw a rectangle shape on the active layer via the tool state machine. */
function drawRect(from = { x: 10, y: 10 }, to = { x: 30, y: 30 }) {
  store().setTool('rectangle');
  store().setSize(2);
  store().pointerDown({ ...from });
  store().pointerUp({ ...to });
}

function drawStroke(
  points = [
    { x: 60, y: 10 },
    { x: 80, y: 10 },
  ],
) {
  store().setTool('brush');
  store().setSize(2);
  store().pointerDown(points[0]);
  for (const p of points.slice(1)) store().pointerMove(p);
  store().pointerUp(points[points.length - 1]);
}

function enterDesign() {
  store().setMode('design');
  store().setTool('select');
}

beforeEach(() => {
  store().newDocument({ width: 100, height: 80, name: 'Test' });
  // Tests assert exact pixel math; snapping gets its own dedicated test.
  store().setSnapping(false);
});

describe('workspace mode', () => {
  it('starts in draw mode and switching to design activates the select tool', () => {
    expect(store().mode).toBe('draw');
    store().setMode('design');
    expect(store().mode).toBe('design');
    expect(store().tool).toBe('select');
    expect(store().doc.mode).toBe('design');
    expect(store().isDirty).toBe(true); // autosave persists the mode
  });

  it('switching back to draw hides the select tool', () => {
    enterDesign();
    store().setMode('draw');
    expect(store().tool).toBe('brush');
    expect(store().doc.mode).toBe('draw');
  });

  it('mode survives undo (it is document metadata, not a command)', () => {
    drawRect();
    store().setMode('design');
    store().undo();
    expect(store().doc.mode).toBe('design');
  });

  it('loadDocument restores the persisted mode', () => {
    drawRect();
    store().setMode('design');
    const saved = store().doc;
    store().newDocument({ width: 10, height: 10 });
    expect(store().mode).toBe('draw');
    store().loadDocument(saved);
    expect(store().mode).toBe('design');
  });

  it('loadDocument defaults old saves (no mode) to draw', () => {
    const doc = { ...store().doc };
    delete doc.mode;
    store().loadDocument(doc);
    expect(store().mode).toBe('draw');
  });
});

describe('select tool: click, marquee, drag', () => {
  it('click-selects an op and shows a move draft', () => {
    drawRect();
    enterDesign();
    store().pointerDown({ x: 20, y: 20 });
    expect(store().selection).toEqual([store().doc.layers[0].operations[0].id]);
    expect(store().selectDraft?.kind).toBe('move');
    store().pointerUp({ x: 20, y: 20 });
    expect(store().selectDraft).toBeNull();
    // A click without a drag records no history command.
    expect(store().doc.layers[0].operations[0]).toMatchObject({ kind: 'shape' });
  });

  it('clicking empty canvas clears the selection', () => {
    drawRect();
    enterDesign();
    store().pointerDown({ x: 20, y: 20 });
    store().pointerUp({ x: 20, y: 20 });
    expect(store().selection).toHaveLength(1);
    store().pointerDown({ x: 95, y: 75 });
    store().pointerUp({ x: 95, y: 75 });
    expect(store().selection).toHaveLength(0);
  });

  it('shift-click builds a multi-selection', () => {
    drawRect();
    drawStroke();
    enterDesign();
    store().pointerDown({ x: 20, y: 20 });
    store().pointerUp({ x: 20, y: 20 });
    store().pointerDown({ x: 70, y: 10 }, { shiftKey: true });
    store().pointerUp({ x: 70, y: 10 }, { shiftKey: true });
    expect(store().selection).toHaveLength(2);
  });

  it('rubber-band marquee selects intersecting ops', () => {
    drawRect();
    drawStroke();
    enterDesign();
    store().pointerDown({ x: 0, y: 0 });
    store().pointerMove({ x: 50, y: 50 });
    expect(store().selectDraft?.kind).toBe('marquee');
    store().pointerUp({ x: 50, y: 50 });
    expect(store().selection).toEqual([store().doc.layers[0].operations[0].id]);
  });

  it('dragging a selected op moves it, undoably', () => {
    drawRect();
    enterDesign();
    const before = store().doc.layers[0].operations[0] as ShapeOp;
    store().pointerDown({ x: 20, y: 20 });
    store().pointerMove({ x: 30, y: 35 });
    expect(store().selectDraft?.preview).not.toBeNull();
    store().pointerUp({ x: 30, y: 35 });
    const after = store().doc.layers[0].operations[0] as ShapeOp;
    expect(after.from).toEqual({ x: before.from.x + 10, y: before.from.y + 15 });
    store().undo();
    const reverted = store().doc.layers[0].operations[0] as ShapeOp;
    expect(reverted.from).toEqual(before.from);
  });

  it('snapping pulls a dragged selection to the canvas center and emits guides', () => {
    drawRect(); // bounds 9..31
    enterDesign();
    store().setSnapping(true);
    store().pointerDown({ x: 20, y: 20 });
    // Raw delta (29, 20): bounds center lands at (49, 40) — 1px off the
    // vertical canvas center (50) and exactly on the horizontal one (40).
    store().pointerMove({ x: 49, y: 40 });
    const guides = store().selectDraft?.guides ?? [];
    expect(guides.some((g) => g.axis === 'x' && g.position === 50)).toBe(true);
    store().pointerUp({ x: 49, y: 40 });
    const op = store().doc.layers[0].operations[0] as ShapeOp;
    expect(op.from).toEqual({ x: 40, y: 30 }); // snapped delta (30, 20)
  });

  it('a click on an already-selected multi-selection keeps it intact', () => {
    drawRect();
    drawStroke();
    enterDesign();
    const ids = store().doc.layers[0].operations.map((op) => op.id);
    store().setSelection(ids);
    store().pointerDown({ x: 20, y: 20 });
    store().pointerUp({ x: 20, y: 20 });
    expect(store().selection).toEqual(ids);
  });

  it('selection does not leak across layers or tools', () => {
    drawRect();
    enterDesign();
    store().pointerDown({ x: 20, y: 20 });
    store().pointerUp({ x: 20, y: 20 });
    expect(store().selection).toHaveLength(1);
    store().setTool('brush');
    expect(store().selection).toHaveLength(0);
  });
});

describe('transform handles', () => {
  it('dragging a corner handle scales the selection about the opposite corner', () => {
    drawRect(); // bounds 9..31 with stroke width 2
    enterDesign();
    store().pointerDown({ x: 20, y: 20 });
    store().pointerUp({ x: 20, y: 20 });
    // Bounds are 9..31 → grab the se corner at (31, 31) and double it.
    store().pointerDown({ x: 31, y: 31 });
    expect(store().selectDraft?.kind).toBe('scale');
    store().pointerMove({ x: 53, y: 53 }); // anchor nw (9,9): 44/22 = 2x
    store().pointerUp({ x: 53, y: 53 });
    const op = store().doc.layers[0].operations[0] as ShapeOp;
    expect(op.from).toEqual({ x: 11, y: 11 });
    expect(op.to).toEqual({ x: 51, y: 51 });
  });

  it('dragging the rotate handle rotates strokes freely', () => {
    drawStroke([
      { x: 40, y: 40 },
      { x: 60, y: 40 },
    ]);
    enterDesign();
    store().pointerDown({ x: 50, y: 40 });
    store().pointerUp({ x: 50, y: 40 });
    // Rotate handle sits 22px above the top-center of the bounds (bounds y 39).
    store().pointerDown({ x: 50, y: 17 });
    expect(store().selectDraft?.kind).toBe('rotate');
    expect(store().selectDraft?.rotation).toEqual({ angle: 0, snap: 'free' });
    store().pointerMove({ x: 60, y: 40 }); // from straight-up to right: +90°
    expect(store().selectDraft?.rotation).toMatchObject({ snap: 'free' });
    expect(store().selectDraft?.rotation?.angle).toBeCloseTo(Math.PI / 2);
    store().pointerUp({ x: 60, y: 40 });
    const op = store().doc.layers[0].operations[0] as StrokeOp;
    expect(op.points[0].x).toBeCloseTo(50);
    expect(op.points[0].y).toBeCloseTo(30);
    expect(op.points[1].x).toBeCloseTo(50);
    expect(op.points[1].y).toBeCloseTo(50);
  });

  it('reports the exact constrained angle for rotation feedback', () => {
    drawRect();
    enterDesign();
    store().pointerDown({ x: 20, y: 20 });
    store().pointerUp({ x: 20, y: 20 });
    store().pointerDown({ x: 20, y: -13 });
    store().pointerMove({ x: 40, y: 20 });
    expect(store().selectDraft?.rotation).toMatchObject({ snap: '90' });
    expect(store().selectDraft?.rotation?.angle).toBeCloseTo(Math.PI / 2);
  });
});

describe('selection actions', () => {
  it('recolors vector selections as one undoable command', () => {
    drawRect();
    enterDesign();
    store().setSelection([store().doc.layers[0].operations[0].id]);
    store().recolorSelection('#ef4444');
    expect(store().doc.layers[0].operations[0].color).toBe('#ef4444');
    store().undo();
    expect(store().doc.layers[0].operations[0].color).toBe('#1f2937');
  });

  it('nudge moves by exact pixels and is undoable', () => {
    drawRect();
    enterDesign();
    store().setSelection([store().doc.layers[0].operations[0].id]);
    store().nudgeSelection(10, 0);
    const op = store().doc.layers[0].operations[0] as ShapeOp;
    expect(op.from).toEqual({ x: 20, y: 10 });
    store().undo();
    expect((store().doc.layers[0].operations[0] as ShapeOp).from).toEqual({ x: 10, y: 10 });
  });

  it('places selection bounds at each canvas edge, undoably', () => {
    drawRect();
    enterDesign();
    const id = store().doc.layers[0].operations[0].id;
    store().setSelection([id]);
    const original = selectionUnionBounds(store().doc.layers[0].operations, [id])!;

    store().placeSelection('left');
    expect(selectionUnionBounds(store().doc.layers[0].operations, [id])!.x).toBeCloseTo(0);
    store().undo();

    store().placeSelection('right');
    const right = selectionUnionBounds(store().doc.layers[0].operations, [id])!;
    expect(right.x + right.width).toBeCloseTo(store().doc.width);
    store().undo();

    store().placeSelection('top');
    expect(selectionUnionBounds(store().doc.layers[0].operations, [id])!.y).toBeCloseTo(0);
    store().undo();

    store().placeSelection('bottom');
    const bottom = selectionUnionBounds(store().doc.layers[0].operations, [id])!;
    expect(bottom.y + bottom.height).toBeCloseTo(store().doc.height);
    store().undo();

    const restored = selectionUnionBounds(store().doc.layers[0].operations, [id])!;
    expect(restored).toEqual(original);
  });

  it('scales around the selection center and is undoable', () => {
    drawRect();
    enterDesign();
    store().setSelection([store().doc.layers[0].operations[0].id]);
    store().scaleSelection(2);
    const scaled = store().doc.layers[0].operations[0] as ShapeOp;
    expect(scaled.from).toEqual({ x: 0, y: 0 });
    expect(scaled.to).toEqual({ x: 40, y: 40 });
    expect(scaled.size).toBe(4);
    store().undo();
    const restored = store().doc.layers[0].operations[0] as ShapeOp;
    expect(restored.from).toEqual({ x: 10, y: 10 });
    expect(restored.to).toEqual({ x: 30, y: 30 });
  });

  it('delete removes the ops, undo restores them', () => {
    drawRect();
    drawStroke();
    enterDesign();
    store().setSelection(store().doc.layers[0].operations.map((op) => op.id));
    store().deleteSelection();
    expect(store().doc.layers[0].operations).toHaveLength(0);
    expect(store().selection).toHaveLength(0);
    store().undo();
    expect(store().doc.layers[0].operations).toHaveLength(2);
  });

  it('duplicate offsets the clones and selects them', () => {
    drawRect();
    enterDesign();
    const original = store().doc.layers[0].operations[0] as ShapeOp;
    store().setSelection([original.id]);
    store().duplicateSelection();
    const ops = store().doc.layers[0].operations;
    expect(ops).toHaveLength(2);
    expect(store().selection).toEqual([ops[1].id]);
    expect((ops[1] as ShapeOp).from).toEqual({ x: 22, y: 22 });
    store().undo();
    expect(store().doc.layers[0].operations).toHaveLength(1);
  });

  it('group makes ops select as one; ungroup restores individuality', () => {
    drawRect();
    drawStroke();
    enterDesign();
    const ids = store().doc.layers[0].operations.map((op) => op.id);
    store().setSelection(ids);
    store().groupSelection();
    expect(store().doc.layers[0].operations.every((op) => op.groupId)).toBe(true);
    // Clicking either op selects both.
    store().clearSelection();
    store().pointerDown({ x: 20, y: 20 });
    store().pointerUp({ x: 20, y: 20 });
    expect(store().selection).toHaveLength(2);
    store().ungroupSelection();
    expect(store().doc.layers[0].operations.every((op) => !op.groupId)).toBe(true);
    store().clearSelection();
    store().pointerDown({ x: 20, y: 20 });
    store().pointerUp({ x: 20, y: 20 });
    expect(store().selection).toHaveLength(1);
  });

  it('bring forward / send backward reorder within the layer', () => {
    drawRect();
    drawStroke();
    enterDesign();
    const [first, second] = store().doc.layers[0].operations.map((op) => op.id);
    store().setSelection([first]);
    store().bringForwardSelection();
    expect(store().doc.layers[0].operations.map((op) => op.id)).toEqual([second, first]);
    store().sendBackwardSelection();
    expect(store().doc.layers[0].operations.map((op) => op.id)).toEqual([first, second]);
  });

  it('align left lines up the selection bounds', () => {
    drawRect({ x: 10, y: 10 }, { x: 20, y: 20 });
    drawRect({ x: 50, y: 40 }, { x: 60, y: 50 });
    enterDesign();
    store().setSelection(store().doc.layers[0].operations.map((op) => op.id));
    store().alignSelection('left');
    const ops = store().doc.layers[0].operations as ShapeOp[];
    expect(ops[0].from.x).toBe(ops[1].from.x);
    store().undo();
    expect((store().doc.layers[0].operations[1] as ShapeOp).from.x).toBe(50);
  });

  it('actions are no-ops on locked layers', () => {
    drawRect();
    enterDesign();
    const id = store().doc.layers[0].operations[0].id;
    store().setSelection([id]);
    store().setLayerLocked(store().activeLayerId, true);
    store().nudgeSelection(5, 5);
    expect((store().doc.layers[0].operations[0] as ShapeOp).from).toEqual({ x: 10, y: 10 });
  });
});

describe('components', () => {
  it('creates a component from the selection and inserts an instance as a new layer', () => {
    drawRect();
    enterDesign();
    store().setSelection([store().doc.layers[0].operations[0].id]);
    const component = store().createComponentFromSelection('Button');
    expect(component).not.toBeNull();
    expect(component!.operations).toHaveLength(1);
    expect(component!.name).toBe('Button');

    store().insertComponentInstance(component!);
    const s = store();
    expect(s.doc.layers).toHaveLength(2);
    expect(s.doc.layers[1].name).toBe('Button');
    expect(s.activeLayerId).toBe(s.doc.layers[1].id);
    expect(s.selection).toHaveLength(1);
    // The instance is a copy: a different op id, centered in the document.
    const instance = s.doc.layers[1].operations[0] as ShapeOp;
    expect(instance.id).not.toBe(component!.operations[0].id);
    store().undo();
    expect(store().doc.layers).toHaveLength(1);
  });

  it('createComponentFromSelection needs a selection and a name', () => {
    enterDesign();
    expect(store().createComponentFromSelection('Nope')).toBeNull();
    drawRect();
    store().setTool('select');
    store().setSelection([store().doc.layers[0].operations[0].id]);
    expect(store().createComponentFromSelection('  ')).toBeNull();
  });
});

describe('data plots', () => {
  it('inserts grouped marks as one selected layer and undoes the complete plot', () => {
    const operations: ShapeOp[] = [
      {
        kind: 'shape',
        id: 'plot-axis',
        groupId: 'plot-1',
        shape: 'line',
        from: { x: 10, y: 60 },
        to: { x: 90, y: 60 },
        color: '#111111',
        size: 2,
        opacity: 1,
      },
      {
        kind: 'shape',
        id: 'plot-point',
        groupId: 'plot-1',
        shape: 'ellipse',
        from: { x: 30, y: 20 },
        to: { x: 36, y: 26 },
        color: '#2563eb',
        size: 1,
        opacity: 1,
        fill: true,
      },
    ];

    store().insertDataPlot('Experiment', operations);
    expect(store().doc.layers).toHaveLength(2);
    expect(store().doc.layers[1].name).toBe('Experiment');
    expect(store().selection).toEqual([]);
    store().undo();
    expect(store().doc.layers).toHaveLength(1);
  });
});
