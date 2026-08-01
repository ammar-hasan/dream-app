/**
 * Raster and document transforms: flip, rotate 90°, translate, crop, resize.
 *
 * Buffer helpers are pure (new buffer out). Document/layer helpers return new
 * immutable documents via the helpers in document.ts, so they compose with
 * History commands. Point-based ops (strokes, shapes, text) are transformed
 * geometrically; raster ops (fill, image) have their pixels re-baked.
 */

import { mapLayer, withLayers } from './document';
import { boundingRect, normalizeRect } from './geometry';
import type { PixelBuffer } from './filters';
import type { DreamDocument, Layer, Operation, Point, RasterPatch, Rect } from './types';

export type FlipDirection = 'horizontal' | 'vertical';
export type RotateDirection = 'cw' | 'ccw';
export type LayerTransform = 'flip-horizontal' | 'flip-vertical' | 'rotate-cw' | 'rotate-ccw';

export const INVERSE_TRANSFORM: Record<LayerTransform, LayerTransform> = {
  'flip-horizontal': 'flip-horizontal',
  'flip-vertical': 'flip-vertical',
  'rotate-cw': 'rotate-ccw',
  'rotate-ccw': 'rotate-cw',
};

// ---------------------------------------------------------------------------
// Buffer helpers
// ---------------------------------------------------------------------------

export function flipBuffer(src: PixelBuffer, direction: FlipDirection): PixelBuffer {
  const { width: w, height: h } = src;
  const out = new Uint8ClampedArray(src.data.length);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const sx = direction === 'horizontal' ? w - 1 - x : x;
      const sy = direction === 'vertical' ? h - 1 - y : y;
      const from = (sy * w + sx) * 4;
      const to = (y * w + x) * 4;
      out[to] = src.data[from];
      out[to + 1] = src.data[from + 1];
      out[to + 2] = src.data[from + 2];
      out[to + 3] = src.data[from + 3];
    }
  }
  return { data: out, width: w, height: h };
}

export function rotateBuffer90(src: PixelBuffer, direction: RotateDirection): PixelBuffer {
  const { width: w, height: h } = src;
  const out = new Uint8ClampedArray(src.data.length);
  // Output is h × w. Screen coords (y down): cw maps (x, y) -> (h-1-y, x).
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const dx = direction === 'cw' ? h - 1 - y : y;
      const dy = direction === 'cw' ? x : w - 1 - x;
      const from = (y * w + x) * 4;
      const to = (dy * h + dx) * 4;
      out[to] = src.data[from];
      out[to + 1] = src.data[from + 1];
      out[to + 2] = src.data[from + 2];
      out[to + 3] = src.data[from + 3];
    }
  }
  return { data: out, width: h, height: w };
}

/** Nearest-neighbor resample to an exact size (used by document resize). */
export function resizeBufferNearest(src: PixelBuffer, width: number, height: number): PixelBuffer {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    const sy = Math.min(src.height - 1, Math.floor((y / h) * src.height));
    for (let x = 0; x < w; x += 1) {
      const sx = Math.min(src.width - 1, Math.floor((x / w) * src.width));
      const from = (sy * src.width + sx) * 4;
      const to = (y * w + x) * 4;
      out[to] = src.data[from];
      out[to + 1] = src.data[from + 1];
      out[to + 2] = src.data[from + 2];
      out[to + 3] = src.data[from + 3];
    }
  }
  return { data: out, width: w, height: h };
}

// ---------------------------------------------------------------------------
// Operation helpers
// ---------------------------------------------------------------------------

/** Rendered bounding box of an operation; null when it has no extent. */
export function operationBounds(op: Operation): Rect | null {
  switch (op.kind) {
    case 'stroke':
      return boundingRect(op.points);
    case 'shape':
      return normalizeRect(op.from, op.to);
    case 'text':
      return { x: op.position.x, y: op.position.y, width: 0, height: 0 };
    case 'fill':
      return { x: op.patch.x, y: op.patch.y, width: op.patch.width, height: op.patch.height };
    case 'image':
      return {
        x: op.patch.x,
        y: op.patch.y,
        width: op.patch.width * op.scale,
        height: op.patch.height * op.scale,
      };
  }
}

function unionRects(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

/** Bounding box of everything on a layer; null when empty. */
export function layerContentBounds(layer: Layer): Rect | null {
  return layer.operations.reduce<Rect | null>(
    (acc, op) => unionRects(acc, operationBounds(op)),
    null,
  );
}

function translatePoint(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy };
}

/** Shift an operation by (dx, dy), returning a new operation. */
export function translateOperation(op: Operation, dx: number, dy: number): Operation {
  switch (op.kind) {
    case 'stroke':
      return { ...op, points: op.points.map((p) => translatePoint(p, dx, dy)) };
    case 'shape':
      return { ...op, from: translatePoint(op.from, dx, dy), to: translatePoint(op.to, dx, dy) };
    case 'text':
      return { ...op, position: translatePoint(op.position, dx, dy) };
    case 'fill':
    case 'image':
      return { ...op, patch: { ...op.patch, x: op.patch.x + dx, y: op.patch.y + dy } };
  }
}

/** Move all content of a layer by (dx, dy). */
export function translateLayer(
  doc: DreamDocument,
  layerId: string,
  dx: number,
  dy: number,
): DreamDocument {
  return mapLayer(doc, layerId, (layer) => ({
    ...layer,
    operations: layer.operations.map((op) => translateOperation(op, dx, dy)),
  }));
}

// --- flip / rotate around a center -----------------------------------------

function transformPoint(p: Point, cx: number, cy: number, transform: LayerTransform): Point {
  const dx = p.x - cx;
  const dy = p.y - cy;
  switch (transform) {
    case 'flip-horizontal':
      return { x: cx - dx, y: p.y };
    case 'flip-vertical':
      return { x: p.x, y: cy - dy };
    // Screen coords (y down): cw maps (dx, dy) -> (-dy, dx); ccw -> (dy, -dx).
    case 'rotate-cw':
      return { x: cx - dy, y: cy + dx };
    case 'rotate-ccw':
      return { x: cx + dy, y: cy - dx };
  }
}

function transformPatch(
  patch: RasterPatch,
  scale: number,
  cx: number,
  cy: number,
  transform: LayerTransform,
): { patch: RasterPatch; scale: number } {
  const rw = patch.width * scale;
  const rh = patch.height * scale;
  switch (transform) {
    case 'flip-horizontal':
      return {
        patch: {
          ...flipBuffer(patch, 'horizontal'),
          x: Math.round(2 * cx - (patch.x + rw)),
          y: patch.y,
        },
        scale,
      };
    case 'flip-vertical':
      return {
        patch: {
          ...flipBuffer(patch, 'vertical'),
          x: patch.x,
          y: Math.round(2 * cy - (patch.y + rh)),
        },
        scale,
      };
    case 'rotate-cw': {
      // The old bottom-left corner becomes the new top-left.
      const tl = transformPoint({ x: patch.x, y: patch.y + rh }, cx, cy, transform);
      return {
        patch: { ...rotateBuffer90(patch, 'cw'), x: Math.round(tl.x), y: Math.round(tl.y) },
        scale,
      };
    }
    case 'rotate-ccw': {
      // The old top-right corner becomes the new top-left.
      const tl = transformPoint({ x: patch.x + rw, y: patch.y }, cx, cy, transform);
      return {
        patch: { ...rotateBuffer90(patch, 'ccw'), x: Math.round(tl.x), y: Math.round(tl.y) },
        scale,
      };
    }
  }
}

/** Flip/rotate a single operation around (cx, cy). */
export function transformOperation(
  op: Operation,
  cx: number,
  cy: number,
  transform: LayerTransform,
): Operation {
  switch (op.kind) {
    case 'stroke':
      return { ...op, points: op.points.map((p) => transformPoint(p, cx, cy, transform)) };
    case 'shape':
      return {
        ...op,
        from: transformPoint(op.from, cx, cy, transform),
        to: transformPoint(op.to, cx, cy, transform),
      };
    case 'text':
      // The anchor moves with the content; glyphs themselves stay upright.
      return { ...op, position: transformPoint(op.position, cx, cy, transform) };
    case 'fill':
      return { ...op, patch: transformPatch(op.patch, 1, cx, cy, transform).patch };
    case 'image':
      return { ...op, patch: transformPatch(op.patch, op.scale, cx, cy, transform).patch };
  }
}

/**
 * Flip or rotate a whole layer around the center of its own content, so the
 * content stays in place. No-op on empty layers.
 */
export function transformLayer(
  doc: DreamDocument,
  layerId: string,
  transform: LayerTransform,
): DreamDocument {
  return mapLayer(doc, layerId, (layer) => {
    const bounds = layerContentBounds(layer);
    if (!bounds) return layer;
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    return {
      ...layer,
      operations: layer.operations.map((op) => transformOperation(op, cx, cy, transform)),
    };
  });
}

// --- crop / resize ----------------------------------------------------------

/** Clip a scale-1 patch to a rect (doc coords); null when fully outside. */
export function clipPatch(patch: RasterPatch, rect: Rect): RasterPatch | null {
  const x0 = Math.max(patch.x, rect.x);
  const y0 = Math.max(patch.y, rect.y);
  const x1 = Math.min(patch.x + patch.width, rect.x + rect.width);
  const y1 = Math.min(patch.y + patch.height, rect.y + rect.height);
  if (x1 <= x0 || y1 <= y0) return null;
  const w = x1 - x0;
  const h = y1 - y0;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    const from = ((y0 - patch.y + y) * patch.width + (x0 - patch.x)) * 4;
    const to = y * w * 4;
    data.set(patch.data.subarray(from, from + w * 4), to);
  }
  return { x: x0, y: y0, width: w, height: h, data };
}

/**
 * Crop the document to `rect`: the canvas shrinks, every operation shifts by
 * (-rect.x, -rect.y), and scale-1 raster patches are clipped to the crop
 * (scaled images keep their pixels — rendering clips them anyway).
 * Applies to EVERY frame when the document is animated.
 */
export function cropDocument(doc: DreamDocument, rect: Rect): DreamDocument {
  const crop: Rect = {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
  const cropLayers = (stack: Layer[]): Layer[] =>
    stack.map((layer) => ({
      ...layer,
      operations: layer.operations.flatMap((op): Operation[] => {
        if (op.kind === 'fill' || (op.kind === 'image' && op.scale === 1)) {
          const clipped = clipPatch(op.patch, crop);
          if (!clipped) return [];
          const moved = translateOperation({ ...op, patch: clipped }, -crop.x, -crop.y);
          return [moved];
        }
        return [translateOperation(op, -crop.x, -crop.y)];
      }),
    }));
  return mapAllFrames({ ...doc, width: crop.width, height: crop.height }, cropLayers);
}

function scaleOperation(op: Operation, sx: number, sy: number): Operation {
  const mid = (sx + sy) / 2;
  switch (op.kind) {
    case 'stroke':
      return {
        ...op,
        points: op.points.map((p) => ({ x: p.x * sx, y: p.y * sy })),
        size: op.size * mid,
      };
    case 'shape':
      return {
        ...op,
        from: { x: op.from.x * sx, y: op.from.y * sy },
        to: { x: op.to.x * sx, y: op.to.y * sy },
        size: op.size * mid,
      };
    case 'text':
      return {
        ...op,
        position: { x: op.position.x * sx, y: op.position.y * sy },
        fontSize: op.fontSize * mid,
      };
    case 'fill': {
      const resized = resizeBufferNearest(op.patch, op.patch.width * sx, op.patch.height * sy);
      return {
        ...op,
        patch: { ...resized, x: Math.round(op.patch.x * sx), y: Math.round(op.patch.y * sy) },
      };
    }
    case 'image': {
      // Resample the pixels (nearest) so non-uniform resizes distort exactly;
      // the user-facing scale factor is left alone.
      const resized = resizeBufferNearest(op.patch, op.patch.width * sx, op.patch.height * sy);
      return {
        ...op,
        patch: { ...resized, x: Math.round(op.patch.x * sx), y: Math.round(op.patch.y * sy) },
      };
    }
  }
}

/**
 * Resize the document, scaling all content to fit (nearest-neighbor for
 * raster pixels). Undo restores the exact previous document.
 * Applies to EVERY frame when the document is animated.
 */
export function resizeDocument(doc: DreamDocument, width: number, height: number): DreamDocument {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const sx = w / doc.width;
  const sy = h / doc.height;
  const scaleLayers = (stack: Layer[]): Layer[] =>
    stack.map((layer) => ({
      ...layer,
      operations: layer.operations.map((op) => scaleOperation(op, sx, sy)),
    }));
  return mapAllFrames({ ...doc, width: w, height: h }, scaleLayers);
}

/**
 * Run `fn` over every layer stack in the document: the single stack for a
 * plain document, or every frame's stack (active included) when animated.
 */
function mapAllFrames(doc: DreamDocument, fn: (layers: Layer[]) => Layer[]): DreamDocument {
  if (!doc.frames) return withLayers(doc, fn(doc.layers));
  const frames = doc.frames.map((frame) => ({ ...frame, layers: fn(frame.layers) }));
  const active = frames.find((f) => f.id === doc.activeFrameId);
  return { ...doc, frames, layers: active ? active.layers : doc.layers, updatedAt: Date.now() };
}
