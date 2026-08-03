import { describe, expect, it } from 'vitest';
import {
  brandPackFileName,
  brandRasterSize,
  buildStoredZip,
  buildStoredZipBytes,
  crc32,
} from './brandPack';

const encoder = new TextEncoder();

describe('brand pack', () => {
  it('plans exact long-edge raster sizes without changing aspect ratio', () => {
    expect(brandRasterSize({ width: 1024, height: 768 })).toEqual({ width: 1024, height: 768 });
    expect(brandRasterSize({ width: 1024, height: 768 }, 512)).toEqual({
      width: 512,
      height: 384,
    });
    expect(brandRasterSize({ width: 200, height: 800 }, 1024)).toEqual({
      width: 256,
      height: 1024,
    });
  });

  it('makes safe, stable download names', () => {
    expect(brandPackFileName('  North / Star  ')).toBe('North - Star-brand-pack.zip');
    expect(brandPackFileName(' ../ ')).toBe('dream-brand-pack.zip');
    expect(brandPackFileName('\u0000')).toBe('dream-brand-pack.zip');
  });

  it('writes deterministic stored ZIP entries with valid CRC-32 metadata', () => {
    const data = encoder.encode('123456789');
    expect(crc32(data)).toBe(0xcbf43926);

    const entries = [
      { name: 'logo-512.png', data },
      { name: 'لوگو.svg', data: encoder.encode('<svg/>') },
    ];
    const bytes = buildStoredZipBytes(entries);
    const blob = buildStoredZip(entries);
    const view = new DataView(bytes.buffer);
    expect(blob.type).toBe('application/zip');
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(6, true)).toBe(0x0800);
    expect(view.getUint32(14, true)).toBe(0xcbf43926);
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(bytes.length - 12, true)).toBe(2);
    expect(new TextDecoder().decode(bytes)).toContain('logo-512.png');
    expect(new TextDecoder().decode(bytes)).toContain('لوگو.svg');
  });
});
