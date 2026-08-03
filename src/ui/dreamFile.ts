/**
 * `.dream` project files in the browser: the canvas-based raster codec for
 * the pure engine format (engine/projectFile.ts), plus download/open helpers.
 */

import { decodeProject, encodeProject, type RasterCodec } from '../engine/projectFile';
import type { DreamDocument } from '../engine/types';
import { downloadBlob } from './exportAnimation';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode a PNG payload'));
    image.src = src;
  });
}

/** RasterCodec backed by the browser canvas (RGBA bytes ↔ PNG data URL). */
export const browserRasterCodec: RasterCodec = {
  async encode(patch) {
    const canvas = document.createElement('canvas');
    canvas.width = patch.width;
    canvas.height = patch.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    ctx.putImageData(new ImageData(patch.data, patch.width, patch.height), 0, 0);
    return canvas.toDataURL('image/png');
  },
  async decode(dataUrl) {
    const image = await loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { width: canvas.width, height: canvas.height, data: pixels.data };
  },
};

export function dreamFileName(docName: string): string {
  return `${docName.trim() || 'dream'}.dream`;
}

export type DreamFileReadStage = 'reading' | 'restoring';

export interface DreamFileReadOptions {
  signal?: AbortSignal;
  onProgress?: (stage: DreamFileReadStage) => void;
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error('Project opening cancelled');
  error.name = 'AbortError';
  throw error;
}

/** Serialize the document as a `.dream` file and trigger a download. */
export async function downloadDreamFile(doc: DreamDocument): Promise<void> {
  const text = await encodeProject(doc, browserRasterCodec);
  downloadBlob(new Blob([text], { type: 'application/json' }), dreamFileName(doc.name));
}

/** Parse a `.dream` file picked or dropped by the user. Throws on bad input. */
export async function readDreamFile(
  file: File,
  options: DreamFileReadOptions = {},
): Promise<DreamDocument> {
  throwIfCancelled(options.signal);
  options.onProgress?.('reading');
  const text = await file.text();
  throwIfCancelled(options.signal);
  options.onProgress?.('restoring');
  const doc = await decodeProject(text, browserRasterCodec);
  throwIfCancelled(options.signal);
  return doc;
}
