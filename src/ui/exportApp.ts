/**
 * App mode export: rasterize every frame, hand the images + hotspot data to
 * the pure HTML generator (engine/appExport) and download ONE self-contained
 * .html file — the prototype anyone can open, offline, no Dream required.
 */

import { activeFrameIndex } from '../engine/animation';
import { buildAppExportData, buildAppHtml } from '../engine/appExport';
import { renderDocument } from '../engine/renderer';
import type { DreamDocument } from '../engine/types';
import { downloadBlob } from './exportAnimation';

export function appFileName(docName: string): string {
  return `${docName.trim() || 'dream'}-app.html`;
}

export function exportAppHtml(doc: DreamDocument): void {
  const frames = doc.frames ?? [];
  if (frames.length === 0) return;
  const images: string[] = [];
  for (const frame of frames) {
    const canvas = document.createElement('canvas');
    canvas.width = doc.width;
    canvas.height = doc.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderDocument({ ...doc, layers: frame.layers }, ctx);
    images.push(canvas.toDataURL('image/png'));
  }
  const data = buildAppExportData(doc, images, activeFrameIndex(doc));
  const blob = new Blob([buildAppHtml(data)], { type: 'text/html' });
  downloadBlob(blob, appFileName(doc.name));
}
