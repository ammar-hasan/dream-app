/**
 * Document renderer. Pure given a 2D context: `renderDocument(doc, ctx)` draws
 * the whole document, nothing is read from or written to any global state.
 *
 * The context is typed as the structural subset `Renderer2D` so tests can pass
 * a lightweight recording mock instead of a real canvas.
 */

import { cssColor, resolveOpColor } from './color';
import { applyAdjustments, isIdentity, normalizeAdjustments } from './filters';
import { hasActiveEffect, normalizeEffects } from './effects';
import { arrowheadPoints, normalizeRect } from './geometry';
import { sprayDots } from './spray';
import type {
  Color,
  DreamDocument,
  Layer,
  LayerBlendMode,
  LayerEffect,
  LayerMaskStroke,
  Operation,
  ProjectColor,
  RasterPatch,
  ShapeOp,
  StrokeOp,
} from './types';

/** Structural subset of CanvasRenderingContext2D used by the renderer. */
export interface Renderer2D {
  globalAlpha: number;
  globalCompositeOperation: string;
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  font: string;
  textBaseline: string;
  /** Native drop-shadow controls (used by the layer-effect stack). */
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  save(): void;
  restore(): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  fill(): void;
  rect(x: number, y: number, w: number, h: number): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
  ): void;
  fillText(text: string, x: number, y: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  getImageData(
    sx: number,
    sy: number,
    sw: number,
    sh: number,
  ): {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  };
  putImageData(image: unknown, dx: number, dy: number): void;
  drawImage(image: unknown, dx: number, dy: number, dw?: number, dh?: number): void;
}

/** Minimal stand-in for an offscreen canvas (used to rasterize fill patches). */
export interface CanvasLike {
  width: number;
  height: number;
  getContext(type: '2d'): Renderer2D | null;
}

export interface RenderOptions {
  /** Paint the document background first. Default true. */
  background?: boolean;
  /** Restrict which layers are painted (default: all visible layers). */
  layerFilter?: (layer: Layer) => boolean;
  /**
   * Saved project colors used to resolve op `colorRef` links at paint time.
   * `renderDocument` injects `doc.projectColors` automatically; callers that
   * render a single layer (thumbnails, exports) pass the doc's colors through.
   */
  projectColors?: ProjectColor[];
  /** Factory for offscreen canvases (fill patches). Defaults to document.createElement. */
  createCanvas?: (width: number, height: number) => CanvasLike;
  /** Factory for ImageData wrappers. Defaults to the global ImageData constructor. */
  createImageData?: (data: Uint8ClampedArray, width: number, height: number) => unknown;
}

interface ResolvedFactories {
  createCanvas: (width: number, height: number) => CanvasLike;
  createImageData: (data: Uint8ClampedArray, width: number, height: number) => unknown;
}

function resolveFactories(opts: RenderOptions): ResolvedFactories {
  const createCanvas =
    opts.createCanvas ??
    (typeof document !== 'undefined'
      ? (width: number, height: number): CanvasLike => {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          return canvas;
        }
      : undefined);
  const createImageData =
    opts.createImageData ??
    (typeof ImageData !== 'undefined'
      ? (data: Uint8ClampedArray, width: number, height: number) =>
          new ImageData(data, width, height)
      : undefined);
  if (!createCanvas || !createImageData) {
    throw new Error(
      'renderDocument: raster operations, layer adjustments and masks need `createCanvas`/`createImageData` options outside a browser environment',
    );
  }
  return { createCanvas, createImageData };
}

export function renderDocument(
  doc: DreamDocument,
  ctx: Renderer2D,
  opts: RenderOptions = {},
): void {
  const merged = doc.projectColors ? { ...opts, projectColors: doc.projectColors } : opts;
  ctx.save();
  try {
    if (merged.background !== false) {
      ctx.fillStyle = doc.background;
      ctx.fillRect(0, 0, doc.width, doc.height);
    }
    for (const layer of doc.layers) {
      if (!layer.visible) continue;
      if (merged.layerFilter && !merged.layerFilter(layer)) continue;
      renderCompositedLayer(layer, doc.width, doc.height, ctx, merged);
    }
  } finally {
    ctx.restore();
  }
}

export function renderLayer(layer: Layer, ctx: Renderer2D, opts: RenderOptions = {}): void {
  for (const op of layer.operations) {
    renderOperation(op, ctx, { ...opts, layerOpacity: layer.opacity });
  }
}

export function layerCompositeOperation(blendMode: LayerBlendMode | undefined): string {
  return blendMode && blendMode !== 'normal' ? blendMode : 'source-over';
}

/** Composite an already-flattened layer bitmap with its document blend mode. */
export function compositeLayerBitmap(
  layer: Layer,
  bitmap: unknown,
  ctx: Renderer2D,
  opts: RenderOptions = {},
): void {
  const effects = normalizeEffects(layer.effects);
  if (hasActiveEffect(effects)) {
    const canvas = bitmap as CanvasLike;
    drawLayerShadow(ctx, bitmap, canvas.width, canvas.height, effects, opts);
  }
  if (!layer.blendMode || layer.blendMode === 'normal') {
    ctx.drawImage(bitmap, 0, 0);
    return;
  }
  ctx.save();
  try {
    ctx.globalCompositeOperation = layerCompositeOperation(layer.blendMode);
    ctx.drawImage(bitmap, 0, 0);
  } finally {
    ctx.restore();
  }
}

/**
 * Cast each enabled shadow effect behind the layer. Uses the native
 * `shadow*` properties on a scratch canvas to blur/offset the bitmap's alpha
 * silhouette, then strips the bitmap itself so only the halo lands behind.
 */
function drawLayerShadow(
  ctx: Renderer2D,
  bitmap: unknown,
  width: number,
  height: number,
  effects: LayerEffect[],
  opts: RenderOptions,
): void {
  const { createCanvas } = resolveFactories(opts);
  for (const effect of effects) {
    if (effect.type !== 'shadow' || !effect.enabled) continue;
    const { color, opacity, radius, offsetX, offsetY } = effect.params;
    if (opacity <= 0) continue;
    const scratch = createCanvas(width, height);
    const sctx = scratch.getContext('2d');
    if (!sctx) continue;
    sctx.save();
    sctx.shadowColor = cssColor(color, opacity);
    sctx.shadowBlur = radius;
    sctx.shadowOffsetX = offsetX;
    sctx.shadowOffsetY = offsetY;
    sctx.drawImage(bitmap, 0, 0);
    sctx.restore();
    // Erase the bitmap itself, leaving only the offset/blur halo behind.
    sctx.globalCompositeOperation = 'destination-out';
    sctx.drawImage(bitmap, 0, 0);
    ctx.drawImage(scratch, 0, 0);
  }
}

/** Render one layer bitmap with its editable adjustments applied. */
export function renderLayerBitmap(
  layer: Layer,
  width: number,
  height: number,
  opts: RenderOptions = {},
): CanvasLike {
  const { createCanvas, createImageData } = resolveFactories(opts);
  const bitmap = createCanvas(width, height);
  const layerCtx = bitmap.getContext('2d');
  if (!layerCtx) return bitmap;
  renderLayer(layer, layerCtx, opts);
  const adjustments = normalizeAdjustments(layer.adjustments);
  if (!isIdentity(adjustments)) {
    const source = layerCtx.getImageData(0, 0, width, height);
    const adjusted = applyAdjustments(source, adjustments);
    layerCtx.putImageData(createImageData(adjusted.data, width, height), 0, 0);
  }
  if (layer.mask?.enabled && layer.mask.strokes.length > 0) {
    const maskBitmap = createCanvas(width, height);
    const maskCtx = maskBitmap.getContext('2d');
    if (maskCtx) {
      maskCtx.fillStyle = 'rgba(255, 255, 255, 1)';
      maskCtx.fillRect(0, 0, width, height);
      for (const stroke of layer.mask.strokes) renderMaskStroke(stroke, maskCtx);
      layerCtx.save();
      try {
        layerCtx.globalAlpha = 1;
        layerCtx.globalCompositeOperation = 'destination-in';
        layerCtx.drawImage(maskBitmap, 0, 0);
      } finally {
        layerCtx.restore();
      }
    }
  }
  return bitmap;
}

/** Flatten one effected or blended layer before combining it with the artwork below. */
export function renderCompositedLayer(
  layer: Layer,
  width: number,
  height: number,
  ctx: Renderer2D,
  opts: RenderOptions = {},
): void {
  const adjustments = normalizeAdjustments(layer.adjustments);
  const effects = normalizeEffects(layer.effects);
  if (
    (!layer.blendMode || layer.blendMode === 'normal') &&
    isIdentity(adjustments) &&
    !hasActiveEffect(effects) &&
    !(layer.mask?.enabled && layer.mask.strokes.length > 0)
  ) {
    renderLayer(layer, ctx, opts);
    return;
  }
  const bitmap = renderLayerBitmap(layer, width, height, opts);
  compositeLayerBitmap(layer, bitmap, ctx, opts);
}

function renderMaskStroke(stroke: LayerMaskStroke, ctx: Renderer2D): void {
  if (stroke.points.length === 0) return;
  ctx.save();
  try {
    ctx.globalAlpha = stroke.opacity;
    ctx.globalCompositeOperation = stroke.mode === 'hide' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (stroke.widths && stroke.widths.length === stroke.points.length) {
      for (let i = 1; i < stroke.points.length; i += 1) {
        ctx.lineWidth = Math.max(
          0.5,
          ((stroke.widths[i - 1] + stroke.widths[i]) / 2) * stroke.size,
        );
        ctx.beginPath();
        ctx.moveTo(stroke.points[i - 1].x, stroke.points[i - 1].y);
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        ctx.stroke();
      }
      return;
    }
    ctx.lineWidth = stroke.size;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (const point of stroke.points.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

export interface OperationRenderOptions extends RenderOptions {
  /** Extra opacity multiplier (typically the owning layer's opacity). */
  layerOpacity?: number;
}

export function renderOperation(
  op: Operation,
  ctx: Renderer2D,
  opts: OperationRenderOptions = {},
): void {
  ctx.save();
  try {
    ctx.globalAlpha = op.opacity * (opts.layerOpacity ?? 1);
    const color = resolveOpColor(op, opts.projectColors);
    switch (op.kind) {
      case 'stroke':
        renderStroke(op, ctx, color);
        break;
      case 'shape':
        renderShape(op, ctx, color);
        break;
      case 'text':
        ctx.fillStyle = cssColor(color);
        ctx.font = `${op.fontSize}px ${op.fontFamily}`;
        ctx.textBaseline = 'top';
        ctx.fillText(op.text, op.position.x, op.position.y);
        break;
      case 'fill':
        renderPatch(op.patch, 1, ctx, opts);
        break;
      case 'image':
        renderPatch(op.patch, op.scale, ctx, opts);
        break;
    }
  } finally {
    ctx.restore();
  }
}

function renderStroke(op: StrokeOp, ctx: Renderer2D, color: Color): void {
  if (op.points.length === 0) return;
  if (op.tool === 'spray') {
    renderSpray(op, ctx, color);
    return;
  }
  const erasing = op.tool === 'eraser';
  ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
  ctx.strokeStyle = erasing ? 'rgba(0, 0, 0, 1)' : cssColor(color);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (op.widths && op.widths.length === op.points.length) {
    // Pen pressure: stroke segment by segment, interpolating the width
    // between the two endpoints' multipliers.
    for (let i = 1; i < op.points.length; i += 1) {
      ctx.lineWidth = Math.max(0.5, ((op.widths[i - 1] + op.widths[i]) / 2) * op.size);
      ctx.beginPath();
      ctx.moveTo(op.points[i - 1].x, op.points[i - 1].y);
      ctx.lineTo(op.points[i].x, op.points[i].y);
      ctx.stroke();
    }
    return;
  }
  ctx.lineWidth = op.size;
  ctx.beginPath();
  ctx.moveTo(op.points[0].x, op.points[0].y);
  for (const p of op.points.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

function renderSpray(op: StrokeOp, ctx: Renderer2D, color: Color): void {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = cssColor(color);
  for (const dot of sprayDots(op)) {
    ctx.fillRect(dot.x - dot.size / 2, dot.y - dot.size / 2, dot.size, dot.size);
  }
}

function renderShape(op: ShapeOp, ctx: Renderer2D, color: Color): void {
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (op.shape === 'line') {
    ctx.moveTo(op.from.x, op.from.y);
    ctx.lineTo(op.to.x, op.to.y);
    if (op.lineStyle === 'arrow' || op.lineStyle === 'double-arrow') {
      const [a, b] = arrowheadPoints(op.from, op.to, op.size);
      ctx.moveTo(op.to.x, op.to.y);
      ctx.lineTo(a.x, a.y);
      ctx.moveTo(op.to.x, op.to.y);
      ctx.lineTo(b.x, b.y);
    }
    if (op.lineStyle === 'double-arrow') {
      const [a, b] = arrowheadPoints(op.to, op.from, op.size);
      ctx.moveTo(op.from.x, op.from.y);
      ctx.lineTo(a.x, a.y);
      ctx.moveTo(op.from.x, op.from.y);
      ctx.lineTo(b.x, b.y);
    }
  } else if (op.shape === 'rectangle') {
    const r = normalizeRect(op.from, op.to);
    ctx.rect(r.x, r.y, r.width, r.height);
  } else {
    const cx = (op.from.x + op.to.x) / 2;
    const cy = (op.from.y + op.to.y) / 2;
    ctx.ellipse(
      cx,
      cy,
      Math.abs(op.to.x - op.from.x) / 2,
      Math.abs(op.to.y - op.from.y) / 2,
      0,
      0,
      Math.PI * 2,
    );
  }
  if (op.fill && op.shape !== 'line') {
    // Filled variant: interior in the op color, no outline.
    ctx.fillStyle = cssColor(color);
    ctx.fill();
    return;
  }
  ctx.strokeStyle = cssColor(color);
  ctx.lineWidth = op.size;
  ctx.stroke();
}

function renderPatch(
  patch: RasterPatch,
  scale: number,
  ctx: Renderer2D,
  opts: RenderOptions,
): void {
  // Rasterize the patch on a scratch canvas so layer/op opacity applies
  // through drawImage (putImageData ignores globalAlpha and compositing).
  const { createCanvas, createImageData } = resolveFactories(opts);
  const scratch = createCanvas(patch.width, patch.height);
  const scratchCtx = scratch.getContext('2d');
  if (!scratchCtx) return;
  scratchCtx.putImageData(createImageData(patch.data, patch.width, patch.height), 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(scratch, patch.x, patch.y, patch.width * scale, patch.height * scale);
}
