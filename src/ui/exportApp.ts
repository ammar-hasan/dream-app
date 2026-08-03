/**
 * App mode export: rasterize every frame, hand the images + hotspot data to
 * the pure HTML generator (engine/appExport) and download ONE self-contained
 * .html file — the prototype anyone can open, offline, no Dream required.
 */

import { activeFrameIndex } from '../engine/animation';
import { buildAppExportData, buildAppHtml, type AppExportData } from '../engine/appExport';
import { renderDocument } from '../engine/renderer';
import type { DreamDocument } from '../engine/types';
import { downloadBlob } from './exportAnimation';

export function appFileName(docName: string): string {
  return `${docName.trim() || 'dream'}-app.html`;
}

/** Flatten the viewer-safe app model: screens + hotspots, no project internals. */
export function renderAppExportData(doc: DreamDocument): AppExportData | null {
  const frames = doc.frames ?? [];
  if (frames.length === 0) return null;
  const images: string[] = [];
  for (const frame of frames) {
    const canvas = document.createElement('canvas');
    canvas.width = doc.width;
    canvas.height = doc.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    renderDocument({ ...doc, layers: frame.layers }, ctx);
    images.push(canvas.toDataURL('image/png'));
  }
  return buildAppExportData(doc, images, activeFrameIndex(doc));
}

export function exportAppHtml(doc: DreamDocument): void {
  const data = renderAppExportData(doc);
  if (!data) return;
  const blob = new Blob([buildAppHtml(data)], { type: 'text/html' });
  downloadBlob(blob, appFileName(doc.name));
}
