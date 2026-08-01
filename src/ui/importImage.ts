/**
 * Image import: decode image files into engine pixel buffers and place them
 * as new layers. Used by the file picker, drag-and-drop and clipboard paste.
 */

import type { PixelBuffer } from '../engine/filters';
import { useDreamStore } from '../store/dreamStore';

/** Decode an image blob into a plain RGBA pixel buffer via a scratch canvas. */
export async function decodeImage(file: Blob): Promise<PixelBuffer> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { data: image.data, width: image.width, height: image.height };
  } finally {
    bitmap.close();
  }
}

/** Import every image file in the list; non-image entries are skipped. */
export async function importImageFiles(files: Iterable<File>): Promise<void> {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const buffer = await decodeImage(file);
      const name = file.name.replace(/\.[^.]+$/, '');
      useDreamStore.getState().importImage(buffer, name);
    } catch (error) {
      console.error('Image import failed', error);
    }
  }
}
