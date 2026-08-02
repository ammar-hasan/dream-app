/**
 * Node raster codec for the .dream project file format, backed by
 * @napi-rs/canvas (native skia prebuilds — no DOM, no browser). Also hosts
 * the frame renderer used by the render_png and export_app tools.
 *
 * The engine stays dependency-free; this package is the ONLY place a canvas
 * implementation is plugged into it (see engine/renderer.ts RenderOptions).
 */

import { createCanvas, ImageData, loadImage } from '@napi-rs/canvas';
import { renderDocument, type CanvasLike, type Renderer2D } from '../../src/engine/renderer';
import type { RasterCodec } from '../../src/engine/projectFile';
import type { DreamDocument, Layer } from '../../src/engine/types';

export const nodeRasterCodec: RasterCodec = {
  async encode(patch) {
    const canvas = createCanvas(patch.width, patch.height);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(patch.data, patch.width, patch.height), 0, 0);
    return `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`;
  },
  async decode(dataUrl) {
    const comma = dataUrl.indexOf(',');
    if (!dataUrl.startsWith('data:image/png') || comma === -1) {
      throw new Error('Unsupported raster payload: expected a PNG data URL');
    }
    const image = await loadImage(Buffer.from(dataUrl.slice(comma + 1), 'base64'));
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height);
    // Re-wrap: the native buffer's prototype can differ from the caller's
    // realm (vitest), and a plain Uint8ClampedArray is what the engine owns.
    return {
      width: image.width,
      height: image.height,
      data: new Uint8ClampedArray(pixels.data),
    };
  },
};

/** Render a layer stack (at document size) to a PNG buffer. */
export function renderLayersToPng(doc: DreamDocument, layers: Layer[]): Buffer {
  const canvas = createCanvas(doc.width, doc.height);
  const ctx = canvas.getContext('2d');
  renderDocument({ ...doc, layers }, ctx as unknown as Renderer2D, {
    createCanvas: (width, height) => createCanvas(width, height) as unknown as CanvasLike,
    createImageData: (data, width, height) => new ImageData(data, width, height),
  });
  return canvas.toBuffer('image/png');
}

/** Render a layer stack to a PNG data URL (for app export frame images). */
export function renderLayersToPngDataUrl(doc: DreamDocument, layers: Layer[]): string {
  return `data:image/png;base64,${renderLayersToPng(doc, layers).toString('base64')}`;
}
