/** One-download, multi-size brand delivery with truthful optional SVG. */

import { buildSvg, canExportSvg } from '../engine/svgExport';
import type { DreamDocument } from '../engine/types';
import { downloadBlob } from './exportAnimation';
import { renderImageCanvas } from './exportImage';

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const textEncoder = new TextEncoder();
const CRC_TABLE = new Uint32Array(256);
for (let value = 0; value < CRC_TABLE.length; value += 1) {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  CRC_TABLE[value] = crc >>> 0;
}

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = (crc >>> 8) ^ (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0);
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function zipHeader(length: number, write: (view: DataView) => void): Uint8Array {
  const bytes = new Uint8Array(length);
  write(new DataView(bytes.buffer));
  return bytes;
}

/** Build deterministic, standards-compatible ZIP bytes using uncompressed entries. */
export function buildStoredZipBytes(entries: ZipEntry[]): Uint8Array {
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = textEncoder.encode(entry.name);
    const checksum = crc32(entry.data);
    const local = zipHeader(30, (view) => {
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, 0x0021, true);
      view.setUint32(14, checksum, true);
      view.setUint32(18, entry.data.length, true);
      view.setUint32(22, entry.data.length, true);
      view.setUint16(26, name.length, true);
      view.setUint16(28, 0, true);
    });
    localChunks.push(local, name, entry.data);

    const central = zipHeader(46, (view) => {
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(8, 0x0800, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, 0, true);
      view.setUint16(14, 0x0021, true);
      view.setUint32(16, checksum, true);
      view.setUint32(20, entry.data.length, true);
      view.setUint32(24, entry.data.length, true);
      view.setUint16(28, name.length, true);
      view.setUint16(30, 0, true);
      view.setUint16(32, 0, true);
      view.setUint16(34, 0, true);
      view.setUint16(36, 0, true);
      view.setUint32(38, 0, true);
      view.setUint32(42, localOffset, true);
    });
    centralChunks.push(central, name);
    localOffset += local.length + name.length + entry.data.length;
  }

  const central = concatBytes(centralChunks);
  const end = zipHeader(22, (view) => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, entries.length, true);
    view.setUint16(10, entries.length, true);
    view.setUint32(12, central.length, true);
    view.setUint32(16, localOffset, true);
    view.setUint16(20, 0, true);
  });
  return concatBytes([...localChunks, central, end]);
}

export function buildStoredZip(entries: ZipEntry[]): Blob {
  const bytes = buildStoredZipBytes(entries);
  return new Blob([bytes.buffer], { type: 'application/zip' });
}

export function brandRasterSize(
  doc: Pick<DreamDocument, 'width' | 'height'>,
  longEdge?: number,
): { width: number; height: number } {
  if (longEdge === undefined) return { width: doc.width, height: doc.height };
  const scale = longEdge / Math.max(doc.width, doc.height);
  return {
    width: Math.max(1, Math.round(doc.width * scale)),
    height: Math.max(1, Math.round(doc.height * scale)),
  };
}

function safeBaseName(name: string): string {
  const safe = Array.from(
    Array.from(name.trim())
      .map((character) =>
        character.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(character) ? '-' : character,
      )
      .join('')
      .replace(/^[-.\s]+|[-.\s]+$/g, ''),
  )
    .slice(0, 80)
    .join('');
  return safe || 'dream';
}

export function brandPackFileName(name: string): string {
  return `${safeBaseName(name)}-brand-pack.zip`;
}

function canvasPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG encoding failed'));
        return;
      }
      void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
    }, 'image/png');
  });
}

async function rasterEntry(
  doc: DreamDocument,
  base: string,
  suffix: string,
  longEdge?: number,
): Promise<ZipEntry> {
  const size = brandRasterSize(doc, longEdge);
  const canvas = renderImageCanvas(doc, size.width, size.height);
  if (!canvas) throw new Error('Canvas unavailable');
  return { name: `${base}-${suffix}.png`, data: await canvasPngBytes(canvas) };
}

export async function buildBrandPack(doc: DreamDocument): Promise<Blob> {
  const base = safeBaseName(doc.name);
  const entries: ZipEntry[] = [];
  entries.push(await rasterEntry(doc, base, 'source'));
  entries.push(await rasterEntry(doc, base, '1024', 1024));
  entries.push(await rasterEntry(doc, base, '512', 512));
  if (canExportSvg(doc)) {
    entries.push({ name: `${base}.svg`, data: textEncoder.encode(buildSvg(doc)) });
  }
  return buildStoredZip(entries);
}

export async function exportBrandPack(
  doc: DreamDocument,
  download: (blob: Blob, name: string) => void = downloadBlob,
): Promise<void> {
  download(await buildBrandPack(doc), brandPackFileName(doc.name));
}
