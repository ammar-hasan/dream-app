/**
 * Incremental document compositor.
 *
 * Redrawing a big document on every pointermove (stroke previews, pan, zoom)
 * re-issues every operation; this cache keeps one offscreen bitmap per layer
 * and only re-renders a layer when its content actually changed — immutable
 * updates mean a new `operations`/adjustments/mask reference or a new opacity — then
 * composites the bitmaps with one `drawImage` per layer.
 *
 * DOM-free like the rest of the engine: bitmap canvases come from the
 * injectable `createCanvas` factory (browser default, mock in tests).
 *
 * Correctness rules:
 * - Eraser strokes composite with `destination-out`, which punches through
 *   EVERYTHING already drawn — lower layers and the background — so layers
 *   cannot be cached independently when an eraser is in play. Documents with
 *   a visible eraser stroke fall back to a single whole-document snapshot
 *   (same "document unchanged → one drawImage" win, no per-layer
 *   incrementality).
 * - Documents larger than MAX_CACHE_PIXELS skip caching entirely and render
 *   directly, capping bitmap memory (~4 bytes/pixel/bitmap).
 */

import { compositeLayerBitmap, renderCompositedLayer, renderLayerBitmap } from './renderer';
import type { CanvasLike, RenderOptions, Renderer2D } from './renderer';
import type { DreamDocument, Layer } from './types';

/** Bitmaps are doc-sized RGBA canvases; beyond this, caching is skipped. */
export const MAX_CACHE_PIXELS = 2048 * 2048;

/** Most documents have a handful of layers; bound the cache regardless. */
const DEFAULT_MAX_ENTRIES = 16;

interface LayerEntry {
  operations: Layer['operations'];
  opacity: number;
  adjustments: Layer['adjustments'];
  mask: Layer['mask'];
  /** Ref of the project colors the bitmap was baked against (linked-color invalidation). */
  projectColors: DreamDocument['projectColors'];
  canvas: CanvasLike;
}

interface Snapshot {
  layers: DreamDocument['layers'];
  background: DreamDocument['background'];
  projectColors: DreamDocument['projectColors'];
  canvas: CanvasLike;
}

export interface LayerCacheOptions extends RenderOptions {
  /** Maximum cached layer bitmaps (LRU eviction beyond that). Default 16. */
  maxEntries?: number;
}

export interface CompositeOptions {
  /** Paint the document background first. Default true. */
  background?: boolean;
  /** Restrict which layers are painted (default: all visible layers). */
  layerFilter?: (layer: Layer) => boolean;
}

export class LayerCache {
  private readonly opts: LayerCacheOptions;
  private readonly maxEntries: number;
  private readonly entries = new Map<string, LayerEntry>();
  private snapshot: Snapshot | null = null;

  constructor(opts: LayerCacheOptions = {}) {
    this.opts = opts;
    this.maxEntries = opts.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  /** Number of cached per-layer bitmaps (the snapshot, if any, is separate). */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Composite `doc` onto `ctx`, re-rendering only what changed since the last
   * call. Painter's order and output match `renderDocument` exactly.
   */
  render(doc: DreamDocument, ctx: Renderer2D, opts: CompositeOptions = {}): void {
    const layers = doc.layers.filter(
      (layer) => layer.visible && (!opts.layerFilter || opts.layerFilter(layer)),
    );
    const cacheable = doc.width * doc.height <= MAX_CACHE_PIXELS;
    const erasing = cacheable && layers.some(hasEraser);
    // A snapshot is the whole stack in one bitmap — impossible for a
    // filtered (partial) render, and it already contains the background.
    const useSnapshot = erasing && !opts.layerFilter;
    // Linked-color resolution: every bitmap render reads the current project
    // colors, so they ride on the opts and the cache invalidates on their ref.
    const renderOpts: RenderOptions = { ...this.opts, ...opts, projectColors: doc.projectColors };

    ctx.save();
    try {
      if (opts.background !== false && !useSnapshot) {
        ctx.fillStyle = doc.background;
        ctx.fillRect(0, 0, doc.width, doc.height);
      }
      // Forget layers that no longer exist, whichever path runs below.
      for (const id of [...this.entries.keys()]) {
        if (!doc.layers.some((l) => l.id === id)) this.deleteEntry(id);
      }
      if (!cacheable || (erasing && opts.layerFilter)) {
        this.renderDirect(layers, doc.width, doc.height, ctx, renderOpts);
      } else if (useSnapshot) {
        this.renderSnapshot(doc, layers, ctx, renderOpts);
      } else {
        for (const layer of layers) {
          compositeLayerBitmap(layer, this.entryFor(doc, layer, renderOpts).canvas, ctx);
        }
      }
    } finally {
      ctx.restore();
    }
  }

  /** Drop one layer's bitmap (the next render re-renders it). */
  invalidate(layerId: string): void {
    this.deleteEntry(layerId);
  }

  /** Drop every cached bitmap — call when switching documents. */
  clear(): void {
    for (const id of [...this.entries.keys()]) this.deleteEntry(id);
    if (this.snapshot) {
      this.releaseCanvas(this.snapshot.canvas);
      this.snapshot = null;
    }
  }

  private renderDirect(
    layers: Layer[],
    width: number,
    height: number,
    ctx: Renderer2D,
    opts: RenderOptions,
  ): void {
    for (const layer of layers) {
      renderCompositedLayer(layer, width, height, ctx, opts);
    }
  }

  private renderSnapshot(
    doc: DreamDocument,
    layers: Layer[],
    ctx: Renderer2D,
    opts: RenderOptions,
  ): void {
    let snap = this.snapshot;
    if (
      !snap ||
      snap.layers !== doc.layers ||
      snap.background !== doc.background ||
      snap.projectColors !== doc.projectColors ||
      snap.canvas.width !== doc.width ||
      snap.canvas.height !== doc.height
    ) {
      const canvas = this.createCanvas(doc.width, doc.height);
      const snapCtx = canvas.getContext('2d');
      if (snapCtx) {
        // The background is part of the snapshot: erasers punch through it.
        snapCtx.fillStyle = doc.background;
        snapCtx.fillRect(0, 0, doc.width, doc.height);
        for (const layer of layers) {
          renderCompositedLayer(layer, doc.width, doc.height, snapCtx, opts);
        }
      }
      if (snap) this.releaseCanvas(snap.canvas);
      snap = {
        layers: doc.layers,
        background: doc.background,
        projectColors: doc.projectColors,
        canvas,
      };
      this.snapshot = snap;
    }
    ctx.drawImage(snap.canvas, 0, 0);
  }

  private entryFor(doc: DreamDocument, layer: Layer, opts: RenderOptions): LayerEntry {
    const hit = this.entries.get(layer.id);
    if (
      hit &&
      hit.operations === layer.operations &&
      hit.opacity === layer.opacity &&
      hit.adjustments === layer.adjustments &&
      hit.mask === layer.mask &&
      hit.projectColors === doc.projectColors
    ) {
      // LRU: re-insert to mark as most recently used.
      this.entries.delete(layer.id);
      this.entries.set(layer.id, hit);
      return hit;
    }
    const canvas = renderLayerBitmap(layer, doc.width, doc.height, opts);
    const entry: LayerEntry = {
      operations: layer.operations,
      opacity: layer.opacity,
      adjustments: layer.adjustments,
      mask: layer.mask,
      projectColors: doc.projectColors,
      canvas,
    };
    this.deleteEntry(layer.id);
    this.entries.set(layer.id, entry);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.deleteEntry(oldest);
    }
    return entry;
  }

  private deleteEntry(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.releaseCanvas(entry.canvas);
    this.entries.delete(id);
  }

  /** Setting the size to 0 releases the bitmap's backing store. */
  private releaseCanvas(canvas: CanvasLike): void {
    canvas.width = 0;
    canvas.height = 0;
  }

  private createCanvas(width: number, height: number): CanvasLike {
    if (this.opts.createCanvas) return this.opts.createCanvas(width, height);
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    throw new Error('LayerCache: provide a `createCanvas` factory outside a browser environment');
  }
}

function hasEraser(layer: Layer): boolean {
  return layer.operations.some((op) => op.kind === 'stroke' && op.tool === 'eraser');
}
