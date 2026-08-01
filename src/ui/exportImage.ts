/** Flatten the document to an image file and trigger a browser download. */

import { renderDocument } from '../engine/renderer';
import type { DreamDocument } from '../engine/types';

export interface ExportOptions {
  format: 'png' | 'jpeg';
  /** JPEG only, 0..1. */
  quality?: number;
}

export function exportImage(doc: DreamDocument, options: ExportOptions): void {
  const canvas = document.createElement('canvas');
  canvas.width = doc.width;
  canvas.height = doc.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  renderDocument(doc, ctx);
  const mime = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const link = document.createElement('a');
  link.href = canvas.toDataURL(mime, options.quality);
  link.download = `${doc.name.trim() || 'dream'}.${options.format === 'jpeg' ? 'jpg' : 'png'}`;
  link.click();
}

export function exportPng(doc: DreamDocument): void {
  exportImage(doc, { format: 'png' });
}
