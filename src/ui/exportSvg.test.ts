import { describe, expect, it, vi } from 'vitest';
import { createDocument } from '../engine/document';
import { exportSvg, svgFileName } from './exportSvg';

describe('SVG download', () => {
  it('uses a stable filename and SVG mime type', () => {
    const download = vi.fn();
    const doc = createDocument({ width: 100, height: 80, name: '  Lab notes  ' });
    exportSvg(doc, download);
    expect(download).toHaveBeenCalledTimes(1);
    const [blob, name] = download.mock.calls[0] as [Blob, string];
    expect(name).toBe('Lab notes.svg');
    expect(blob.type).toBe('image/svg+xml;charset=utf-8');
    expect(svgFileName('   ')).toBe('dream.svg');
  });
});
