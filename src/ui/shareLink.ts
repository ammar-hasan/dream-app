import { buildAppHtml, type AppExportData, type AppExportHotspot } from '../engine/appExport';
import type { DreamDocument, HotspotTransition } from '../engine/types';
import { renderAppExportData } from './exportApp';

export const SHARE_HASH_PREFIX = '#dream-share=v1.';
export const MAX_SHARE_URL_LENGTH = 100_000;
const MAX_DECOMPRESSED_BYTES = 2_000_000;
const MAX_FRAMES = 30;

export class ShareLinkTooLargeError extends Error {
  override name = 'ShareLinkTooLargeError';
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid share payload');
  const padded =
    value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function transform(bytes: Uint8Array, stream: TransformStream): Promise<Uint8Array> {
  const readable = new Response(bytes).body;
  if (!readable) throw new Error('Streams are unavailable');
  const reader = readable
    .pipeThrough(stream)
    .getReader() as ReadableStreamDefaultReader<Uint8Array>;
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_DECOMPRESSED_BYTES) {
      await reader.cancel();
      throw new Error('Share payload is too large');
    }
    chunks.push(value);
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function compress(bytes: Uint8Array): Promise<Uint8Array> {
  return transform(bytes, new CompressionStream('gzip'));
}

async function decompress(bytes: Uint8Array): Promise<Uint8Array> {
  return transform(bytes, new DecompressionStream('gzip'));
}

function pngDimensions(dataUrl: string): { width: number; height: number } | null {
  const match =
    /^data:image\/png;base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/.exec(
      dataUrl,
    );
  if (!match) return null;
  try {
    const header = atob(match[1].slice(0, 32));
    if (header.length < 24 || header.slice(1, 4) !== 'PNG' || header.slice(12, 16) !== 'IHDR') {
      return null;
    }
    const read = (offset: number) =>
      ((header.charCodeAt(offset) << 24) |
        (header.charCodeAt(offset + 1) << 16) |
        (header.charCodeAt(offset + 2) << 8) |
        header.charCodeAt(offset + 3)) >>>
      0;
    return { width: read(16), height: read(20) };
  } catch {
    return null;
  }
}

function isHotspot(value: unknown, frameCount: number): value is AppExportHotspot {
  if (typeof value !== 'object' || value === null) return false;
  const hotspot = value as Partial<AppExportHotspot>;
  const numbers = [hotspot.x, hotspot.y, hotspot.width, hotspot.height];
  const transition: HotspotTransition | undefined = hotspot.transition;
  return (
    numbers.every(
      (number) =>
        typeof number === 'number' && Number.isFinite(number) && number >= 0 && number <= 1,
    ) &&
    Number.isInteger(hotspot.target) &&
    (hotspot.target ?? -1) >= 0 &&
    (hotspot.target ?? frameCount) < frameCount &&
    (transition === 'none' || transition === 'fade' || transition === 'slide')
  );
}

export function validateAppShareData(value: unknown): AppExportData {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid shared app');
  const data = value as Partial<AppExportData>;
  if (
    typeof data.title !== 'string' ||
    data.title.length > 200 ||
    !Number.isInteger(data.width) ||
    !Number.isInteger(data.height) ||
    (data.width ?? 0) < 1 ||
    (data.height ?? 0) < 1 ||
    (data.width ?? 0) > 8192 ||
    (data.height ?? 0) > 8192 ||
    !Array.isArray(data.frames) ||
    data.frames.length < 1 ||
    data.frames.length > MAX_FRAMES ||
    !Number.isInteger(data.startIndex) ||
    (data.startIndex ?? -1) < 0 ||
    (data.startIndex ?? data.frames.length) >= data.frames.length
  ) {
    throw new Error('Invalid shared app');
  }
  for (const frame of data.frames) {
    if (typeof frame !== 'object' || frame === null) throw new Error('Invalid shared app');
    const dimensions = typeof frame.image === 'string' ? pngDimensions(frame.image) : null;
    if (!dimensions || dimensions.width !== data.width || dimensions.height !== data.height) {
      throw new Error('Invalid shared app image');
    }
    if (
      !Array.isArray(frame.hotspots) ||
      !frame.hotspots.every((hotspot) => isHotspot(hotspot, data.frames!.length))
    ) {
      throw new Error('Invalid shared app links');
    }
  }
  return data as AppExportData;
}

export async function encodeAppShareHash(
  data: AppExportData,
  compressor: (bytes: Uint8Array) => Promise<Uint8Array> = compress,
): Promise<string> {
  validateAppShareData(data);
  const source = new TextEncoder().encode(JSON.stringify(data));
  if (source.byteLength > MAX_DECOMPRESSED_BYTES) throw new ShareLinkTooLargeError();
  if (typeof CompressionStream === 'undefined') {
    return `${SHARE_HASH_PREFIX}r.${bytesToBase64Url(source)}`;
  }
  return `${SHARE_HASH_PREFIX}g.${bytesToBase64Url(await compressor(source))}`;
}

export async function decodeAppShareHash(
  hash: string,
  decompressor: (bytes: Uint8Array) => Promise<Uint8Array> = decompress,
): Promise<AppExportData | null> {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return null;
  const payload = hash.slice(SHARE_HASH_PREFIX.length);
  const separator = payload.indexOf('.');
  if (separator < 1) throw new Error('Invalid share payload');
  const method = payload.slice(0, separator);
  const encoded = base64UrlToBytes(payload.slice(separator + 1));
  const bytes = method === 'g' ? await decompressor(encoded) : method === 'r' ? encoded : null;
  if (!bytes || bytes.byteLength > MAX_DECOMPRESSED_BYTES) throw new Error('Invalid share payload');
  return validateAppShareData(JSON.parse(new TextDecoder().decode(bytes)) as unknown);
}

export async function buildAppShareUrl(data: AppExportData, href: string): Promise<string> {
  const url = new URL(href);
  url.hash = await encodeAppShareHash(data);
  const result = url.toString();
  if (result.length > MAX_SHARE_URL_LENGTH) throw new ShareLinkTooLargeError();
  return result;
}

export async function createAppShareUrl(
  doc: DreamDocument,
  href = window.location.href,
): Promise<string> {
  const data = renderAppExportData(doc);
  if (!data) throw new Error('No frames to share');
  return buildAppShareUrl(data, href);
}

export async function sharedAppHtml(hash: string): Promise<string | null> {
  const data = await decodeAppShareHash(hash);
  return data ? buildAppHtml(data) : null;
}
