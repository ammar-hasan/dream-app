/** Flatten the document to a PNG and trigger a browser download. */

import { renderDocument } from '../engine/renderer';
import type { DreamDocument } from '../engine/types';

export function exportPng(doc: DreamDocument): void {
  const canvas = document.createElement('canvas');
  canvas.width = doc.width;
  canvas.height = doc.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  renderDocument(doc, ctx);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${doc.name.trim() || 'dream'}.png`;
  link.click();
}
