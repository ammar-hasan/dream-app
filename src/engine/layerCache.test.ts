import { describe, expect, it } from 'vitest';
import { appendOperation, createDocument, createLayer, insertLayer, withLayers } from './document';
import { LayerCache, MAX_CACHE_PIXELS } from './layerCache';
import { renderDocument } from './renderer';
import { MockContext2D, makeMockFactories } from '../test/mockContext';
import type { DreamDocument, StrokeOp } from './types';

function stroke(id: string, x = 1): StrokeOp {
  return {
    kind: 'stroke',
    id,
    tool: 'brush',
    points: [
      { x, y: 2 },
      { x: x + 2, y: 4 },
    ],
    color: '#ff0000',
    size: 6,
    opacity: 1,
  };
}

/** A document with `layerCount` layers sharing `opCount` brush strokes. */
function bigDoc(layerCount: number, opCount: number): DreamDocument {
  const doc = createDocument({ width: 100, height: 80 });
  const layers = Array.from({ length: layerCount }, (_, i) => createLayer(`Layer ${i + 1}`, []));
  let next = withLayers(doc, layers);
  for (let i = 0; i < opCount; i += 1) {
    next = appendOperation(next, layers[i % layerCount].id, stroke(`op-${i}`, i % 90));
  }
  return next;
}

describe('LayerCache', () => {
  it('composites a 500-op document with ≤ layers+1 draw calls once cached', () => {
    const doc = bigDoc(4, 500);
    const cache = new LayerCache(makeMockFactories());

    const first = new MockContext2D();
    cache.render(doc, first);
    expect(cache.size).toBe(4);

    // Second composite of the unchanged document: background + one drawImage
    // per layer — no operation-level drawing at all.
    const second = new MockContext2D();
    cache.render(doc, second);
    expect(second.calls('fillRect')).toHaveLength(1);
    expect(second.calls('drawImage')).toHaveLength(4);
    expect(second.log).toHaveLength(4 + 1 + 2); // + save/restore
    expect(second.calls('stroke')).toHaveLength(0);
    expect(second.calls('moveTo')).toHaveLength(0);

    // The uncached path pays for every op again: ≥5 method calls per stroke.
    const uncached = new MockContext2D();
    renderDocument(doc, uncached, makeMockFactories());
    expect(uncached.log.length).toBeGreaterThan(500 * 5);
  });

  it('re-renders only the layer whose operations changed', () => {
    const doc = bigDoc(3, 30);
    const factories = makeMockFactories();
    const cache = new LayerCache(factories);
    cache.render(doc, new MockContext2D());
    expect(factories.created).toHaveLength(3);
    const touched = factories.created.map((c) => c.context.calls('stroke').length);

    const edited = appendOperation(doc, doc.layers[1].id, stroke('new-op'));
    cache.render(edited, new MockContext2D());

    // Exactly one new bitmap was rendered — for the edited layer only.
    expect(factories.created).toHaveLength(4);
    const after = factories.created.map((c) => c.context.calls('stroke').length);
    expect(after[0]).toBe(touched[0]); // layer 1: untouched
    expect(after[2]).toBe(touched[2]); // layer 3: untouched
    expect(after[3]).toBeGreaterThan(0); // the fresh bitmap for layer 2
  });

  it('re-renders a layer when its opacity changes', () => {
    const doc = bigDoc(1, 5);
    const factories = makeMockFactories();
    const cache = new LayerCache(factories);
    cache.render(doc, new MockContext2D());
    expect(factories.created).toHaveLength(1);

    const faded = withLayers(doc, [{ ...doc.layers[0], opacity: 0.5 }]);
    cache.render(faded, new MockContext2D());
    expect(factories.created).toHaveLength(2); // same ops, new bitmap
  });

  it('reuses a raw layer bitmap when only its blend mode changes', () => {
    const doc = bigDoc(1, 5);
    const factories = makeMockFactories();
    const cache = new LayerCache(factories);
    cache.render(doc, new MockContext2D());
    expect(factories.created).toHaveLength(1);

    const blended = withLayers(doc, [{ ...doc.layers[0], blendMode: 'screen' }]);
    const ctx = new MockContext2D();
    cache.render(blended, ctx);

    expect(factories.created).toHaveLength(1);
    expect(ctx.calls('drawImage')).toHaveLength(1);
    expect(ctx.globalCompositeOperation).toBe('screen');
  });

  it('re-renders a layer when its editable adjustments change', () => {
    const doc = bigDoc(1, 5);
    const factories = makeMockFactories();
    const cache = new LayerCache(factories);
    cache.render(doc, new MockContext2D());
    expect(factories.created).toHaveLength(1);

    const adjusted = withLayers(doc, [
      {
        ...doc.layers[0],
        adjustments: { ...doc.layers[0].adjustments!, saturation: -100 },
      },
    ]);
    cache.render(adjusted, new MockContext2D());

    expect(factories.created).toHaveLength(2);
    expect(factories.created[1].context.calls('getImageData')).toHaveLength(1);
  });

  it('re-renders a layer when its mask changes', () => {
    const doc = bigDoc(1, 5);
    const factories = makeMockFactories();
    const cache = new LayerCache(factories);
    const masked = withLayers(doc, [{ ...doc.layers[0], mask: { enabled: true, strokes: [] } }]);
    cache.render(masked, new MockContext2D());
    expect(factories.created).toHaveLength(1); // an empty mask needs no extra bitmap

    const edited = withLayers(masked, [
      {
        ...masked.layers[0],
        mask: {
          enabled: true,
          strokes: [
            {
              id: 'm1',
              mode: 'hide',
              points: [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
              ],
              size: 4,
              opacity: 1,
            },
          ],
        },
      },
    ]);
    cache.render(edited, new MockContext2D());
    expect(factories.created).toHaveLength(3); // replacement layer bitmap + painted mask bitmap
    expect(factories.created[2].context.calls('stroke')).toHaveLength(1);
  });

  it('honors visibility and the layer filter without invalidating entries', () => {
    const doc = bigDoc(2, 10);
    const factories = makeMockFactories();
    const cache = new LayerCache(factories);
    cache.render(doc, new MockContext2D());
    expect(factories.created).toHaveLength(2);

    const filtered = new MockContext2D();
    cache.render(doc, filtered, { layerFilter: (layer) => layer.id !== doc.layers[1].id });
    expect(filtered.calls('drawImage')).toHaveLength(1);
    expect(factories.created).toHaveLength(2); // nothing re-rendered

    const hidden = withLayers(doc, [{ ...doc.layers[0], visible: false }, doc.layers[1]]);
    const ctx = new MockContext2D();
    cache.render(hidden, ctx);
    expect(ctx.calls('drawImage')).toHaveLength(1);
    expect(factories.created).toHaveLength(2);
  });

  it('prunes bitmaps of deleted layers and evicts LRU beyond maxEntries', () => {
    const doc = bigDoc(3, 6);
    const cache = new LayerCache({ ...makeMockFactories(), maxEntries: 2 });
    cache.render(doc, new MockContext2D());
    expect(cache.size).toBe(2); // capped

    const smaller = withLayers(doc, doc.layers.slice(0, 1));
    cache.render(smaller, new MockContext2D());
    expect(cache.size).toBe(1); // stale ids pruned
  });

  it('invalidate drops a single layer; clear drops everything', () => {
    const doc = bigDoc(2, 10);
    const factories = makeMockFactories();
    const cache = new LayerCache(factories);
    cache.render(doc, new MockContext2D());
    expect(factories.created).toHaveLength(2);

    cache.invalidate(doc.layers[0].id);
    cache.render(doc, new MockContext2D());
    expect(factories.created).toHaveLength(3);

    cache.clear();
    expect(cache.size).toBe(0);
    cache.render(doc, new MockContext2D());
    expect(factories.created).toHaveLength(5);
  });

  it('falls back to a whole-document snapshot when an eraser is visible', () => {
    let doc = bigDoc(2, 10);
    doc = appendOperation(doc, doc.layers[1].id, { ...stroke('erase'), tool: 'eraser' });
    const factories = makeMockFactories();
    const cache = new LayerCache(factories);
    cache.render(doc, new MockContext2D());
    expect(cache.size).toBe(0); // no per-layer bitmaps
    expect(factories.created).toHaveLength(1); // one snapshot canvas

    // Unchanged doc: the snapshot already holds the background, so the
    // composite is exactly one drawImage.
    const second = new MockContext2D();
    cache.render(doc, second);
    expect(second.calls('drawImage')).toHaveLength(1);
    expect(second.calls('fillRect')).toHaveLength(0);
    expect(factories.created).toHaveLength(1);

    // Any document change re-renders the snapshot once.
    const edited = appendOperation(doc, doc.layers[0].id, stroke('more'));
    cache.render(edited, new MockContext2D());
    expect(factories.created).toHaveLength(2);

    // A filtered (partial) render cannot be a snapshot: it draws directly.
    const filtered = new MockContext2D();
    cache.render(doc, filtered, { layerFilter: () => true });
    expect(filtered.calls('stroke').length).toBeGreaterThan(0);
  });

  it('skips caching entirely for oversized documents', () => {
    const side = Math.ceil(Math.sqrt(MAX_CACHE_PIXELS)) + 1;
    let doc = createDocument({ width: side, height: side });
    doc = insertLayer(doc, createLayer('extra'));
    doc = appendOperation(doc, doc.layers[0].id, stroke('big'));
    const factories = makeMockFactories();
    const cache = new LayerCache(factories);

    const ctx = new MockContext2D();
    cache.render(doc, ctx);
    expect(cache.size).toBe(0);
    expect(factories.created).toHaveLength(0); // no bitmaps allocated
    expect(ctx.calls('stroke')).toHaveLength(1); // drawn directly
  });
});
