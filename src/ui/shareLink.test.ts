import { describe, expect, it } from 'vitest';
import type { AppExportData } from '../engine/appExport';
import {
  decodeAppShareHash,
  encodeAppShareHash,
  ShareLinkTooLargeError,
  sharedAppHtml,
  validateAppShareData,
} from './shareLink';

const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8I1GQAAAABJRU5ErkJggg==';

const app: AppExportData = {
  title: 'Tiny <prototype>',
  width: 1,
  height: 1,
  startIndex: 0,
  frames: [
    {
      image: PNG_1X1,
      hotspots: [{ x: 0, y: 0, width: 1, height: 1, target: 0, transition: 'fade' }],
    },
  ],
};

describe('share links', () => {
  it('round-trips a validated viewer-only app and rebuilds safe HTML', async () => {
    const hash = await encodeAppShareHash(app);
    await expect(decodeAppShareHash(hash)).resolves.toEqual(app);
    const html = await sharedAppHtml(hash);
    expect(html).toContain('<main id="stage" aria-label="Tiny &lt;prototype&gt;">');
    expect(html).toContain('data:image/png;base64,');
    expect(html).not.toContain('<prototype>');
  });

  it('ignores ordinary hashes and rejects external images or broken targets', async () => {
    await expect(decodeAppShareHash('#screen-2')).resolves.toBeNull();
    expect(() =>
      validateAppShareData({
        ...app,
        frames: [{ image: 'https://tracker.example/pixel.png', hotspots: [] }],
      }),
    ).toThrow('Invalid shared app image');
    expect(() =>
      validateAppShareData({
        ...app,
        frames: [{ image: PNG_1X1, hotspots: [{ ...app.frames[0].hotspots[0], target: 2 }] }],
      }),
    ).toThrow('Invalid shared app links');
  });

  it('refuses a decompressed payload too large for a share link', async () => {
    const huge = {
      ...app,
      frames: [{ image: `${PNG_1X1.replace(/=+$/, '')}${'A'.repeat(2_000_002)}`, hotspots: [] }],
    };
    await expect(encodeAppShareHash(huge)).rejects.toBeInstanceOf(ShareLinkTooLargeError);
  });
});
