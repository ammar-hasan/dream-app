/** Tests for the play-mode sprite helpers and default cast drawings. */

import { describe, expect, it } from 'vitest';
import { contentBounds, cropBuffer } from './sprites';
import {
  drawDefaultBad,
  drawDefaultGate,
  drawDefaultGood,
  drawDefaultHero,
  drawDefaultPlatform,
} from './defaults';
import { MockContext2D } from '../test/mockContext';
import type { PixelBuffer } from '../engine/filters';

/** 4x4 buffer with a 2x2 opaque block at (1,1)..(2,2). */
function sampleBuffer(): PixelBuffer {
  const data = new Uint8ClampedArray(4 * 4 * 4);
  for (const [x, y] of [
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
  ]) {
    const i = (y * 4 + x) * 4;
    data[i] = 255;
    data[i + 3] = 255;
  }
  return { data, width: 4, height: 4 };
}

describe('contentBounds', () => {
  it('finds the tight box around non-transparent pixels', () => {
    expect(contentBounds(sampleBuffer())).toEqual({ x: 1, y: 1, width: 2, height: 2 });
  });

  it('returns null for a fully transparent buffer', () => {
    expect(contentBounds({ data: new Uint8ClampedArray(16), width: 2, height: 2 })).toBeNull();
  });
});

describe('cropBuffer', () => {
  it('copies the rectangle into a tightly sized buffer', () => {
    const cropped = cropBuffer(sampleBuffer(), { x: 1, y: 1, width: 2, height: 2 });
    expect(cropped.width).toBe(2);
    expect(cropped.height).toBe(2);
    expect(cropped.data[3]).toBe(255); // first pixel is opaque
    expect(cropped.data.length).toBe(2 * 2 * 4);
  });
});

describe('default cast drawings', () => {
  it('hero is a smiley: two fills for the face, a stroked smile', () => {
    const ctx = new MockContext2D();
    drawDefaultHero(ctx, 50, 50, 64);
    expect(ctx.calls('fill').length).toBeGreaterThanOrEqual(3);
    expect(ctx.calls('stroke').length).toBe(1);
    expect(ctx.fillStyle).toBe('#1f2937');
  });

  it('good thing is a ten-point star path, filled once', () => {
    const ctx = new MockContext2D();
    drawDefaultGood(ctx, 50, 50, 64);
    expect(ctx.calls('lineTo')).toHaveLength(9);
    expect(ctx.calls('fill')).toHaveLength(1);
    expect(ctx.fillStyle).toBe('#facc15');
  });

  it('bad thing is a spiky grump: filled spikes plus a frown', () => {
    const ctx = new MockContext2D();
    drawDefaultBad(ctx, 50, 50, 64);
    expect(ctx.calls('lineTo')).toHaveLength(15); // 8 spikes × 2 - 1 moveTo
    expect(ctx.calls('stroke')).toHaveLength(1);
  });

  it('platform is a filled earth tile with a grass top', () => {
    const ctx = new MockContext2D();
    drawDefaultPlatform(ctx, 50, 50, 64);
    expect(ctx.calls('rect')).toHaveLength(2);
    expect(ctx.calls('fill')).toHaveLength(2);
    expect(ctx.fillStyle).toBe('#4ade80');
  });

  it('every stand-in saves and restores the context', () => {
    for (const draw of [
      drawDefaultHero,
      drawDefaultGood,
      drawDefaultBad,
      drawDefaultGate,
      drawDefaultPlatform,
    ]) {
      const ctx = new MockContext2D();
      draw(ctx, 10, 10, 20);
      expect(ctx.calls('save')).toHaveLength(1);
      expect(ctx.calls('restore')).toHaveLength(1);
    }
  });
});
