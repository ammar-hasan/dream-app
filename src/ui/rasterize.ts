/**
 * Shared raster helpers for panels that need a layer (or the whole
 * document) as pixels: rasterize through the engine renderer on a scratch
 * canvas. The engine itself never touches the DOM — the canvas dance lives
 * here in ui/.
 */

import type { PixelBuffer } from '../engine/filters';
import { renderDocument, renderLayer } from '../engine/renderer';
import type { DreamDocument, Layer, ProjectColor } from '../engine/types';

/**
 * Rasterize a layer at document size, ignoring layer opacity (it is applied at
 * render time). Pass the document's project colors so linked ops resolve to
 * their live swatch value — AI edits and game sprites must sample what the user
 * sees, not the frozen link-time color.
 */
export function rasterizeLayer(
  layer: Layer,
  width: number,
  height: number,
  projectColors: ProjectColor[] = [],
): PixelBuffer | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  renderLayer({ ...layer, opacity: 1 }, ctx, { projectColors });
  const image = ctx.getImageData(0, 0, width, height);
  return { data: image.data, width: image.width, height: image.height };
}

/** Flatten the whole document (background + visible layers) to pixels. */
export function rasterizeDocument(doc: DreamDocument): PixelBuffer | null {
  const canvas = document.createElement('canvas');
  canvas.width = doc.width;
  canvas.height = doc.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  renderDocument(doc, ctx);
  const image = ctx.getImageData(0, 0, doc.width, doc.height);
  return { data: image.data, width: image.width, height: image.height };
}
