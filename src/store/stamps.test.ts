/**
 * Store integration for stamps & starter scenes: click-to-place as ONE
 * undoable command on the active layer, picker state, and scene insertion
 * as a new layer.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useDreamStore } from './dreamStore';
import { STAMP_SIZES } from '../engine/stamps';
import { selectionBounds, unionBounds } from '../engine/selection';

const store = () => useDreamStore.getState();

beforeEach(() => {
  store().newDocument({ width: 400, height: 300, name: 'Test' });
  store().setStamp('star');
  store().setStampSize('medium');
});

describe('stamp tool', () => {
  it('places the selected stamp at the click point as ONE undoable command', () => {
    store().setStamp('heart');
    store().setTool('stamp');
    store().pointerDown({ x: 200, y: 150 });
    store().pointerUp({ x: 200, y: 150 });

    const ops = store().doc.layers[0].operations;
    expect(ops.length).toBeGreaterThan(3);
    const bounds = unionBounds(ops.map(selectionBounds));
    if (!bounds) throw new Error('expected bounds');
    expect(Math.abs(bounds.x + bounds.width / 2 - 200)).toBeLessThan(20);
    expect(Math.abs(bounds.y + bounds.height / 2 - 150)).toBeLessThan(20);

    // One undo removes the whole stamp; redo brings it back.
    store().undo();
    expect(store().doc.layers[0].operations).toHaveLength(0);
    store().redo();
    expect(store().doc.layers[0].operations).toHaveLength(ops.length);
  });

  it('honors the S/M/L size setting', () => {
    store().setTool('stamp');
    store().setStampSize('small');
    store().pointerDown({ x: 100, y: 100 });
    store().pointerUp({ x: 100, y: 100 });
    const small = unionBounds(store().doc.layers[0].operations.map(selectionBounds));

    store().newDocument({ width: 400, height: 300 });
    store().setTool('stamp');
    store().setStampSize('large');
    store().pointerDown({ x: 100, y: 100 });
    store().pointerUp({ x: 100, y: 100 });
    const large = unionBounds(store().doc.layers[0].operations.map(selectionBounds));

    expect(small).toBeTruthy();
    expect(large).toBeTruthy();
    expect(large!.width).toBeGreaterThan(small!.width * 2);
    expect(small!.width).toBeLessThanOrEqual(STAMP_SIZES.small * 1.4);
  });

  it('does nothing on a locked layer', () => {
    const layerId = store().doc.layers[0].id;
    store().setLayerLocked(layerId, true);
    store().setTool('stamp');
    store().pointerDown({ x: 100, y: 100 });
    store().pointerUp({ x: 100, y: 100 });
    // Only the lock command landed in history — no stamp ops appeared.
    expect(store().doc.layers[0].operations).toHaveLength(0);
    store().undo(); // undoes the lock, not a stamp
    expect(store().doc.layers[0].operations).toHaveLength(0);
    expect(store().canUndo).toBe(false);
  });
});

describe('starter scenes', () => {
  it('inserts a coloring-book scene as a new active layer (undoable)', () => {
    const before = store().doc.layers.length;
    store().insertStarterScene('garden', 'Sunny garden');

    expect(store().doc.layers).toHaveLength(before + 1);
    const layer = store().doc.layers[store().doc.layers.length - 1];
    expect(layer.name).toBe('Sunny garden');
    expect(layer.operations.length).toBeGreaterThan(15);
    expect(store().activeLayerId).toBe(layer.id);

    store().undo();
    expect(store().doc.layers).toHaveLength(before);
  });

  it('scenes fit the current document size', () => {
    store().insertStarterScene('sea', 'Under the sea');
    const ops = store().doc.layers[store().doc.layers.length - 1].operations;
    const bounds = unionBounds(ops.map(selectionBounds));
    if (!bounds) throw new Error('expected bounds');
    expect(bounds.x).toBeGreaterThanOrEqual(-6);
    expect(bounds.y).toBeGreaterThanOrEqual(-6);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(406);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(306);
  });
});
