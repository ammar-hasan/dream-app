import { describe, expect, it } from 'vitest';
import {
  adjustBrightness,
  adjustContrast,
  adjustSaturation,
  applyAdjustments,
  blitRegion,
  boxBlur,
  convolve,
  DEFAULT_ADJUSTMENTS,
  extractRegion,
  FILTER_PRESETS,
  grayscale,
  invert,
  isIdentity,
  rotateHue,
  sepia,
  sharpen,
  type PixelBuffer,
} from './filters';

/** One pixel: (100, 150, 200, 255). */
function onePixel(r = 100, g = 150, b = 200, a = 255): PixelBuffer {
  return { data: new Uint8ClampedArray([r, g, b, a]), width: 1, height: 1 };
}

function px(buf: PixelBuffer, index: number): number[] {
  return [...buf.data.slice(index * 4, index * 4 + 4)];
}

describe('per-pixel adjustments', () => {
  it('brightness shifts channels and leaves alpha alone', () => {
    const out = adjustBrightness(onePixel(100, 150, 200, 128), 10);
    // +10% of 255 = 25.5 -> 26
    expect(px(out, 0)).toEqual([126, 176, 226, 128]);
  });

  it('brightness clamps at the extremes', () => {
    expect(px(adjustBrightness(onePixel(), -100), 0)).toEqual([0, 0, 0, 255]);
    expect(px(adjustBrightness(onePixel(), 100), 0)).toEqual([255, 255, 255, 255]);
  });

  it('contrast pivots around 128', () => {
    const src: PixelBuffer = {
      data: new Uint8ClampedArray([127, 128, 129, 255]),
      width: 1,
      height: 1,
    };
    // factor at +100 is ~129.5, so 127 -> 0, 128 -> 128, 129 -> 255
    expect(px(adjustContrast(src, 100), 0)).toEqual([0, 128, 255, 255]);
  });

  it('saturation -100 lands on luma', () => {
    // luma(100,150,200) = 142.98 -> 143
    expect(px(adjustSaturation(onePixel(), -100), 0)).toEqual([143, 143, 143, 255]);
  });

  it('grayscale at full amount equals luma; partial mixes', () => {
    expect(px(grayscale(onePixel(), 100), 0)).toEqual([143, 143, 143, 255]);
    expect(px(grayscale(onePixel(), 50), 0)).toEqual([121, 146, 171, 255]);
  });

  it('sepia applies the classic matrix', () => {
    expect(px(sepia(onePixel(), 100), 0)).toEqual([192, 171, 134, 255]);
  });

  it('invert flips channels; zero amount is a copy', () => {
    expect(px(invert(onePixel(), 100), 0)).toEqual([155, 105, 55, 255]);
    expect(px(invert(onePixel(), 0), 0)).toEqual([100, 150, 200, 255]);
  });

  it('hue rotation by 360° returns (nearly) the original color', () => {
    const out = rotateHue(onePixel(), 360);
    px(out, 0).forEach((v, i) => {
      expect(Math.abs(v - [100, 150, 200, 255][i])).toBeLessThanOrEqual(1);
    });
  });

  it('hue rotation by 0° is the identity', () => {
    expect(px(rotateHue(onePixel(), 0), 0)).toEqual([100, 150, 200, 255]);
  });
});

describe('convolution', () => {
  it('identity kernel leaves the buffer unchanged', () => {
    const src: PixelBuffer = {
      data: new Uint8ClampedArray([10, 20, 30, 40, 50, 60, 70, 80]),
      width: 2,
      height: 1,
    };
    const out = convolve(src, [0, 0, 0, 0, 1, 0, 0, 0, 0]);
    expect([...out.data]).toEqual([...src.data]);
  });

  it('applies a 3x3 average with the divisor', () => {
    // 3x3, all pixels (90, 90, 90) except center (0,0,0): average = 80
    const data = new Uint8ClampedArray(9 * 4);
    for (let i = 0; i < 9; i += 1) {
      if (i !== 4) {
        data[i * 4] = 90;
        data[i * 4 + 1] = 90;
        data[i * 4 + 2] = 90;
      }
      data[i * 4 + 3] = 255;
    }
    const out = convolve({ data, width: 3, height: 3 }, [1, 1, 1, 1, 1, 1, 1, 1, 1], 9);
    expect(px(out, 4)).toEqual([80, 80, 80, 255]);
  });

  it('replicates edge pixels instead of wrapping', () => {
    // 2x1: A=(0,0,0), B=(100,100,100). At A, left/up neighbors replicate A.
    const src: PixelBuffer = {
      data: new Uint8ClampedArray([0, 0, 0, 255, 100, 100, 100, 255]),
      width: 2,
      height: 1,
    };
    const out = convolve(src, [0, 0, 0, 0, 1, 1, 0, 0, 0], 2); // center + right, halved
    expect(px(out, 0)).toEqual([50, 50, 50, 255]); // (A+B)/2
    expect(px(out, 1)).toEqual([100, 100, 100, 255]); // B + replicated B
  });

  it('rejects kernels that are not 3x3', () => {
    expect(() => convolve(onePixel(), [1, 2, 3])).toThrow();
  });
});

describe('blur and sharpen', () => {
  it('box blur radius 0 returns an unchanged copy', () => {
    const src = onePixel();
    const out = boxBlur(src, 0);
    expect(out).not.toBe(src);
    expect([...out.data]).toEqual([...src.data]);
  });

  it('box blur spreads a single bright pixel evenly', () => {
    const data = new Uint8ClampedArray(9 * 4);
    data[4 * 4] = 255; // center red channel
    for (let i = 0; i < 9; i += 1) data[i * 4 + 3] = 255;
    const out = boxBlur({ data, width: 3, height: 3 }, 1);
    // separable: 255/9 ≈ 28 everywhere
    for (let i = 0; i < 9; i += 1) {
      expect(px(out, i)).toEqual([28, 0, 0, 255]);
    }
  });

  it('sharpen boosts a bright center via the 3x3 kernel', () => {
    const data = new Uint8ClampedArray(9 * 4).fill(100);
    data[4 * 4] = 200;
    data[4 * 4 + 1] = 200;
    data[4 * 4 + 2] = 200;
    for (let i = 0; i < 9; i += 1) data[i * 4 + 3] = 255;
    const out = sharpen({ data, width: 3, height: 3 }, 100);
    expect(px(out, 4)).toEqual([255, 255, 255, 255]); // 5*200 - 4*100 = 600 -> clamp
    expect(px(out, 0)).toEqual([100, 100, 100, 255]); // corner unaffected
  });

  it('sharpen amount 0 returns an unchanged copy', () => {
    const src = onePixel();
    expect([...sharpen(src, 0).data]).toEqual([...src.data]);
  });
});

describe('applyAdjustments', () => {
  it('identity adjustments return an equal copy, not the input', () => {
    const src = onePixel();
    const out = applyAdjustments(src, { ...DEFAULT_ADJUSTMENTS });
    expect(out).not.toBe(src);
    expect(out.data).not.toBe(src.data);
    expect([...out.data]).toEqual([...src.data]);
    expect(isIdentity(DEFAULT_ADJUSTMENTS)).toBe(true);
  });

  it('matches the single-filter result when only one value is set', () => {
    const src = onePixel();
    const out = applyAdjustments(src, { ...DEFAULT_ADJUSTMENTS, brightness: 10 });
    expect([...out.data]).toEqual([...adjustBrightness(src, 10).data]);
  });

  it('applies per-pixel ops before blur/sharpen', () => {
    const src = onePixel();
    const out = applyAdjustments(src, { ...DEFAULT_ADJUSTMENTS, invert: 100, blur: 0 });
    expect([...out.data]).toEqual([...invert(src, 100).data]);
  });
});

describe('presets', () => {
  it('exposes the four named presets with unique ids', () => {
    expect(FILTER_PRESETS.map((p) => p.label)).toEqual(['B&W', 'Vintage', 'Cool', 'Warm']);
    expect(new Set(FILTER_PRESETS.map((p) => p.id)).size).toBe(4);
  });

  it('B&W equals full grayscale', () => {
    const src = onePixel();
    const bw = FILTER_PRESETS.find((p) => p.id === 'bw');
    expect(bw).toBeDefined();
    expect([...applyAdjustments(src, bw!.adjustments).data]).toEqual([...grayscale(src, 100).data]);
  });
});

describe('regions (extract/blit)', () => {
  /** 4x2 buffer; pixel (x, y) is (x, y, 0, 255) so position is readable. */
  function grid(width: number, height: number): PixelBuffer {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        data[i] = x;
        data[i + 1] = y;
        data[i + 3] = 255;
      }
    }
    return { data, width, height };
  }

  it('extracts a sub-rectangle', () => {
    const region = extractRegion(grid(4, 2), { x: 1, y: 1, width: 2, height: 1 });
    expect(region.width).toBe(2);
    expect(region.height).toBe(1);
    expect(px(region, 0)).toEqual([1, 1, 0, 255]);
    expect(px(region, 1)).toEqual([2, 1, 0, 255]);
  });

  it('clamps extraction to the buffer', () => {
    const region = extractRegion(grid(4, 2), { x: 3, y: 0, width: 10, height: 10 });
    expect(region.width).toBe(1);
    expect(region.height).toBe(2);
  });

  it('blits a patch back at an offset, clipping at edges', () => {
    const dst = grid(4, 2);
    const patch: PixelBuffer = {
      data: new Uint8ClampedArray([9, 9, 9, 255, 8, 8, 8, 255]),
      width: 2,
      height: 1,
    };
    blitRegion(dst, patch, 3, 1); // second pixel falls off the right edge
    expect(px(dst, 1 * 4 + 3)).toEqual([9, 9, 9, 255]);
    expect(px(dst, 0)).toEqual([0, 0, 0, 255]); // untouched
  });

  it('blits with negative offsets (clipped)', () => {
    const dst = grid(4, 2);
    const patch: PixelBuffer = {
      data: new Uint8ClampedArray([9, 9, 9, 255, 8, 8, 8, 255]),
      width: 2,
      height: 1,
    };
    blitRegion(dst, patch, -1, 0); // first patch pixel is off-canvas
    expect(px(dst, 0)).toEqual([8, 8, 8, 255]);
  });
});
