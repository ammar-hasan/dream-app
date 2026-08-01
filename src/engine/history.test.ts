import { describe, expect, it } from 'vitest';
import { createDocument, createLayer, insertLayer } from './document';
import {
  addLayerCommand,
  addOperationCommand,
  History,
  moveLayerCommand,
  removeLayerCommand,
  updateLayerCommand,
} from './history';
import type { StrokeOp } from './types';

function makeOp(id: string): StrokeOp {
  return {
    kind: 'stroke',
    id,
    tool: 'brush',
    points: [{ x: 0, y: 0 }],
    color: '#000000',
    size: 2,
    opacity: 1,
  };
}

describe('History', () => {
  it('applies commands and reports canUndo/canRedo', () => {
    const history = new History();
    const doc = createDocument({ width: 10, height: 10 });
    expect(history.canUndo).toBe(false);
    const next = history.execute(doc, addOperationCommand(doc.layers[0].id, makeOp('a')));
    expect(next.layers[0].operations).toHaveLength(1);
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it('undo reverts and redo re-applies', () => {
    const history = new History();
    const doc = createDocument({ width: 10, height: 10 });
    const drawn = history.execute(doc, addOperationCommand(doc.layers[0].id, makeOp('a')));
    const undone = history.undo(drawn);
    expect(undone.layers[0].operations).toHaveLength(0);
    expect(history.canRedo).toBe(true);
    const redone = history.redo(undone);
    expect(redone.layers[0].operations).toHaveLength(1);
    expect(redone.layers[0].operations[0].id).toBe('a');
  });

  it('undo/redo on an empty stack returns the same document', () => {
    const history = new History();
    const doc = createDocument({ width: 10, height: 10 });
    expect(history.undo(doc)).toBe(doc);
    expect(history.redo(doc)).toBe(doc);
  });

  it('a new command clears the redo stack', () => {
    const history = new History();
    const doc = createDocument({ width: 10, height: 10 });
    const layerId = doc.layers[0].id;
    let d = history.execute(doc, addOperationCommand(layerId, makeOp('a')));
    d = history.undo(d);
    d = history.execute(d, addOperationCommand(layerId, makeOp('b')));
    expect(history.canRedo).toBe(false);
    expect(d.layers[0].operations.map((o) => o.id)).toEqual(['b']);
  });

  it('evicts the oldest commands beyond the limit', () => {
    const history = new History(3);
    const doc = createDocument({ width: 10, height: 10 });
    const layerId = doc.layers[0].id;
    let d = doc;
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      d = history.execute(d, addOperationCommand(layerId, makeOp(id)));
    }
    expect(history.depth).toBe(3);
    // Only 3 undos available: e, d, c — 'b' and 'a' are gone for good.
    d = history.undo(d);
    d = history.undo(d);
    d = history.undo(d);
    expect(history.canUndo).toBe(false);
    expect(d.layers[0].operations.map((o) => o.id)).toEqual(['a', 'b']);
  });

  it('supports at least 100 steps', () => {
    const history = new History(100);
    const doc = createDocument({ width: 10, height: 10 });
    const layerId = doc.layers[0].id;
    let d = doc;
    for (let i = 0; i < 100; i += 1) {
      d = history.execute(d, addOperationCommand(layerId, makeOp(`op-${i}`)));
    }
    for (let i = 0; i < 100; i += 1) d = history.undo(d);
    expect(d.layers[0].operations).toHaveLength(0);
  });

  it('clear() empties both stacks', () => {
    const history = new History();
    const doc = createDocument({ width: 10, height: 10 });
    const d = history.execute(doc, addOperationCommand(doc.layers[0].id, makeOp('a')));
    history.undo(d);
    history.clear();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });

  it('rejects a limit below 1', () => {
    expect(() => new History(0)).toThrow();
  });
});

describe('layer commands', () => {
  it('removeLayerCommand restores the layer at its original index', () => {
    let doc = createDocument({ width: 10, height: 10 });
    const extra = createLayer('Extra');
    doc = insertLayer(doc, extra); // [Layer 1, Extra]
    const history = new History();
    const removed = history.execute(doc, removeLayerCommand(doc, extra.id));
    expect(removed.layers).toHaveLength(1);
    const restored = history.undo(removed);
    expect(restored.layers.map((l) => l.name)).toEqual(['Layer 1', 'Extra']);
  });

  it('moveLayerCommand reverts to the original position', () => {
    let doc = createDocument({ width: 10, height: 10 });
    doc = insertLayer(doc, createLayer('A'));
    doc = insertLayer(doc, createLayer('B'));
    const history = new History();
    const bottomId = doc.layers[0].id;
    const moved = history.execute(doc, moveLayerCommand(doc, bottomId, 2));
    expect(moved.layers[2].id).toBe(bottomId);
    const reverted = history.undo(moved);
    expect(reverted.layers[0].id).toBe(bottomId);
  });

  it('addLayerCommand removes the layer on revert', () => {
    const doc = createDocument({ width: 10, height: 10 });
    const history = new History();
    const layer = createLayer('New');
    const added = history.execute(doc, addLayerCommand(layer));
    expect(added.layers).toHaveLength(2);
    expect(history.undo(added).layers).toHaveLength(1);
  });

  it('updateLayerCommand restores previous values on revert', () => {
    const doc = createDocument({ width: 10, height: 10 });
    const id = doc.layers[0].id;
    const history = new History();
    const renamed = history.execute(doc, updateLayerCommand(doc, id, { name: 'Sketch' }));
    expect(renamed.layers[0].name).toBe('Sketch');
    expect(history.undo(renamed).layers[0].name).toBe('Layer 1');
  });
});
