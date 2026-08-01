import { describe, expect, it } from 'vitest';
import {
  appendOperation,
  createDocument,
  createLayer,
  insertLayer,
  mapLayer,
  moveLayer,
  removeLayerById,
  removeOperation,
  updateLayerProps,
} from './document';
import type { StrokeOp } from './types';

const op: StrokeOp = {
  kind: 'stroke',
  id: 'op-1',
  tool: 'brush',
  points: [{ x: 1, y: 1 }],
  color: '#000000',
  size: 4,
  opacity: 1,
};

describe('createDocument', () => {
  it('creates a document with one layer and sensible defaults', () => {
    const doc = createDocument({ width: 100, height: 50 });
    expect(doc.width).toBe(100);
    expect(doc.height).toBe(50);
    expect(doc.background).toBe('#ffffff');
    expect(doc.layers).toHaveLength(1);
    expect(doc.layers[0].operations).toEqual([]);
  });

  it('clamps dimensions to at least 1', () => {
    const doc = createDocument({ width: 0, height: -5 });
    expect(doc.width).toBe(1);
    expect(doc.height).toBe(1);
  });
});

describe('operation helpers', () => {
  it('appendOperation is immutable and targets one layer', () => {
    const doc = createDocument({ width: 10, height: 10 });
    const next = appendOperation(doc, doc.layers[0].id, op);
    expect(doc.layers[0].operations).toHaveLength(0);
    expect(next.layers[0].operations).toEqual([op]);
    expect(next).not.toBe(doc);
  });

  it('removeOperation removes by id', () => {
    const base = createDocument({ width: 10, height: 10 });
    const withOp = appendOperation(base, base.layers[0].id, op);
    const without = removeOperation(withOp, base.layers[0].id, op.id);
    expect(without.layers[0].operations).toHaveLength(0);
  });

  it('mapLayer returns the same doc for unknown ids', () => {
    const doc = createDocument({ width: 10, height: 10 });
    expect(mapLayer(doc, 'nope', (l) => l)).toBe(doc);
  });
});

describe('layer helpers', () => {
  it('insertLayer defaults to the top and clamps the index', () => {
    const doc = createDocument({ width: 10, height: 10 });
    const a = createLayer('A');
    const b = createLayer('B');
    const top = insertLayer(doc, a);
    expect(top.layers[top.layers.length - 1].id).toBe(a.id);
    const bottom = insertLayer(top, b, -100);
    expect(bottom.layers[0].id).toBe(b.id);
  });

  it('removeLayerById removes and ignores unknown ids', () => {
    const doc = insertLayer(createDocument({ width: 10, height: 10 }), createLayer('A'));
    const removed = removeLayerById(doc, doc.layers[1].id);
    expect(removed.layers).toHaveLength(1);
    expect(removeLayerById(doc, 'missing')).toBe(doc);
  });

  it('moveLayer reorders within bounds', () => {
    let doc = createDocument({ width: 10, height: 10 });
    const a = createLayer('A');
    doc = insertLayer(doc, a);
    const bottomId = doc.layers[0].id;
    const moved = moveLayer(doc, bottomId, 1);
    expect(moved.layers[1].id).toBe(bottomId);
    expect(moveLayer(doc, bottomId, 0)).toBe(doc); // no-op returns identity
  });

  it('updateLayerProps patches a single layer', () => {
    const doc = createDocument({ width: 10, height: 10 });
    const next = updateLayerProps(doc, doc.layers[0].id, { name: 'Renamed', visible: false });
    expect(next.layers[0].name).toBe('Renamed');
    expect(next.layers[0].visible).toBe(false);
    expect(doc.layers[0].name).toBe('Layer 1');
  });
});
