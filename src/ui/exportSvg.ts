/** Download the active vector-safe canvas/frame as a standalone SVG. */

import { buildSvg } from '../engine/svgExport';
import type { DreamDocument } from '../engine/types';
import { downloadBlob } from './exportAnimation';

export function svgFileName(name: string): string {
  return `${name.trim() || 'dream'}.svg`;
}

export function exportSvg(
  doc: DreamDocument,
  download: (blob: Blob, name: string) => void = downloadBlob,
): void {
  download(
    new Blob([buildSvg(doc)], { type: 'image/svg+xml;charset=utf-8' }),
    svgFileName(doc.name),
  );
}
