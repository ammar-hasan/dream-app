/**
 * Raster filters and adjustments. Pure functions over plain RGBA pixel
 * buffers (the ImageData shape without the DOM class): every filter takes a
 * buffer and returns a NEW buffer, so previews and undo stay trivial.
 *
 * Adjustment ranges:
 * - brightness / contrast / saturation: -100..100 (0 = identity)
 * - hue: -180..180 degrees (0 = identity)
 * - grayscale / sepia / invert / sharpen: 0..100 mix (0 = identity)
 * - blur: 0..20 pixel radius (0 = identity)
 */

/** A plain RGBA pixel buffer; structurally compatible with ImageData. */
export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  grayscale: number;
  sepia: number;
  invert: number;
  blur: number;
  sharpen: number;
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  blur: 0,
  sharpen: 0,
};

export interface FilterPreset {
  id: string;
  label: string;
  adjustments: Adjustments;
}

/** One-tap looks; each is just an Adjustments combo applied to the sliders. */
export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'bw',
    label: 'B&W',
    adjustments: { ...DEFAULT_ADJUSTMENTS, grayscale: 100 },
  },
  {
    id: 'vintage',
    label: 'Vintage',
    adjustments: { ...DEFAULT_ADJUSTMENTS, sepia: 70, contrast: 15, brightness: -5 },
  },
  {
    id: 'cool',
    label: 'Cool',
    adjustments: { ...DEFAULT_ADJUSTMENTS, hue: -15, saturation: 10, brightness: 5 },
  },
  {
    id: 'warm',
    label: 'Warm',
    adjustments: { ...DEFAULT_ADJUSTMENTS, sepia: 25, saturation: 10, brightness: 5 },
  },
];

function copyBuffer(src: PixelBuffer): PixelBuffer {
  return { data: new Uint8ClampedArray(src.data), width: src.width, height: src.height };
}

/** Map every pixel's RGB channels through `fn`; alpha passes through. */
function mapPixels(
  src: PixelBuffer,
  fn: (r: number, g: number, b: number) => [number, number, number],
): PixelBuffer {
  const out = copyBuffer(src);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = fn(d[i], d[i + 1], d[i + 2]);
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
  return out;
}

/** Rec. 709 luma. */
function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function adjustBrightness(src: PixelBuffer, amount: number): PixelBuffer {
  const delta = Math.round((amount / 100) * 255);
  return mapPixels(src, (r, g, b) => [r + delta, g + delta, b + delta]);
}

export function adjustContrast(src: PixelBuffer, amount: number): PixelBuffer {
  const c = (amount / 100) * 255;
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  return mapPixels(src, (r, g, b) => [
    Math.round(factor * (r - 128) + 128),
    Math.round(factor * (g - 128) + 128),
    Math.round(factor * (b - 128) + 128),
  ]);
}

export function adjustSaturation(src: PixelBuffer, amount: number): PixelBuffer {
  const scale = 1 + amount / 100;
  return mapPixels(src, (r, g, b) => {
    const l = luma(r, g, b);
    return [
      Math.round(l + (r - l) * scale),
      Math.round(l + (g - l) * scale),
      Math.round(l + (b - l) * scale),
    ];
  });
}

/** Rotate hue by `degrees` using the standard YIQ rotation matrix. */
export function rotateHue(src: PixelBuffer, degrees: number): PixelBuffer {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // Luma-preserving hue rotation (matrix from the CSS filter spec).
  const m = [
    0.2126 + cos * 0.7874 - sin * 0.2126,
    0.7152 - cos * 0.7152 - sin * 0.7152,
    0.0722 - cos * 0.0722 + sin * 0.9278,
    0.2126 - cos * 0.2126 + sin * 0.143,
    0.7152 + cos * 0.2848 + sin * 0.14,
    0.0722 - cos * 0.0722 - sin * 0.283,
    0.2126 - cos * 0.2126 - sin * 0.7874,
    0.7152 - cos * 0.7152 + sin * 0.7152,
    0.0722 + cos * 0.9278 + sin * 0.0722,
  ];
  return mapPixels(src, (r, g, b) => [
    Math.round(m[0] * r + m[1] * g + m[2] * b),
    Math.round(m[3] * r + m[4] * g + m[5] * b),
    Math.round(m[6] * r + m[7] * g + m[8] * b),
  ]);
}

/** Mix towards grayscale; `amount` 0..100. */
export function grayscale(src: PixelBuffer, amount = 100): PixelBuffer {
  const t = amount / 100;
  return mapPixels(src, (r, g, b) => {
    const l = luma(r, g, b);
    return [Math.round(r + (l - r) * t), Math.round(g + (l - g) * t), Math.round(b + (l - b) * t)];
  });
}

/** Mix towards the classic sepia matrix; `amount` 0..100. */
export function sepia(src: PixelBuffer, amount = 100): PixelBuffer {
  const t = amount / 100;
  return mapPixels(src, (r, g, b) => {
    const sr = 0.393 * r + 0.769 * g + 0.189 * b;
    const sg = 0.349 * r + 0.686 * g + 0.168 * b;
    const sb = 0.272 * r + 0.534 * g + 0.131 * b;
    return [
      Math.round(r + (sr - r) * t),
      Math.round(g + (sg - g) * t),
      Math.round(b + (sb - b) * t),
    ];
  });
}

/** Mix towards inverted colors; `amount` 0..100. */
export function invert(src: PixelBuffer, amount = 100): PixelBuffer {
  const t = amount / 100;
  return mapPixels(src, (r, g, b) => [
    Math.round(r + (255 - 2 * r) * t),
    Math.round(g + (255 - 2 * g) * t),
    Math.round(b + (255 - 2 * b) * t),
  ]);
}

/**
 * Generic 3x3 convolution (edge pixels replicated). RGB only; alpha is
 * copied through unchanged. `divisor` normalizes the kernel (default 1).
 */
export function convolve(src: PixelBuffer, kernel: number[], divisor = 1): PixelBuffer {
  if (kernel.length !== 9) throw new Error('convolve: kernel must have 9 entries');
  const { width: w, height: h } = src;
  const out = copyBuffer(src);
  const s = src.data;
  const d = out.data;
  const at = (x: number, y: number) =>
    (Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const weight = kernel[(ky + 1) * 3 + (kx + 1)];
          if (weight === 0) continue;
          const i = at(x + kx, y + ky);
          r += s[i] * weight;
          g += s[i + 1] * weight;
          b += s[i + 2] * weight;
        }
      }
      const o = (y * w + x) * 4;
      d[o] = Math.round(r / divisor);
      d[o + 1] = Math.round(g / divisor);
      d[o + 2] = Math.round(b / divisor);
    }
  }
  return out;
}

const SHARPEN_KERNEL = [0, -1, 0, -1, 5, -1, 0, -1, 0];

/** Separable box blur with integer `radius`; radius 0 returns a copy. */
export function boxBlur(src: PixelBuffer, radius: number): PixelBuffer {
  const r = Math.floor(radius);
  if (r < 1) return copyBuffer(src);
  const { width: w, height: h } = src;
  const pass = (input: Uint8ClampedArray, horizontal: boolean): Uint8ClampedArray => {
    const out = new Uint8ClampedArray(input.length);
    const size = 2 * r + 1;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let sa = 0;
        for (let k = -r; k <= r; k += 1) {
          const sx = horizontal ? Math.min(w - 1, Math.max(0, x + k)) : x;
          const sy = horizontal ? y : Math.min(h - 1, Math.max(0, y + k));
          const i = (sy * w + sx) * 4;
          sr += input[i];
          sg += input[i + 1];
          sb += input[i + 2];
          sa += input[i + 3];
        }
        const o = (y * w + x) * 4;
        out[o] = Math.round(sr / size);
        out[o + 1] = Math.round(sg / size);
        out[o + 2] = Math.round(sb / size);
        out[o + 3] = Math.round(sa / size);
      }
    }
    return out;
  };
  return { data: pass(pass(src.data, true), false), width: w, height: h };
}

/** Sharpen via a 3x3 kernel, mixed with the original; `amount` 0..100. */
export function sharpen(src: PixelBuffer, amount = 100): PixelBuffer {
  const t = amount / 100;
  if (t === 0) return copyBuffer(src);
  const sharp = convolve(src, SHARPEN_KERNEL);
  const out = copyBuffer(src);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] + (sharp.data[i] - d[i]) * t);
    d[i + 1] = Math.round(d[i + 1] + (sharp.data[i + 1] - d[i + 1]) * t);
    d[i + 2] = Math.round(d[i + 2] + (sharp.data[i + 2] - d[i + 2]) * t);
  }
  return out;
}

/** Copy a rectangular region out of a buffer; the rect is clamped to the buffer. */
export function extractRegion(
  src: PixelBuffer,
  rect: { x: number; y: number; width: number; height: number },
): PixelBuffer {
  const x = Math.max(0, Math.round(rect.x));
  const y = Math.max(0, Math.round(rect.y));
  const width = Math.max(0, Math.min(src.width - x, Math.round(rect.width)));
  const height = Math.max(0, Math.min(src.height - y, Math.round(rect.height)));
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const from = ((y + row) * src.width + x) * 4;
    data.set(src.data.subarray(from, from + width * 4), row * width * 4);
  }
  return { data, width, height };
}

/** Paint `patch` over `dst` at (x, y), clipping at the edges. Returns `dst` (mutated). */
export function blitRegion(
  dst: PixelBuffer,
  patch: PixelBuffer,
  x: number,
  y: number,
): PixelBuffer {
  const px = Math.round(x);
  const py = Math.round(y);
  for (let row = 0; row < patch.height; row += 1) {
    const dy = py + row;
    if (dy < 0 || dy >= dst.height) continue;
    const sx0 = Math.max(0, -px);
    const count = Math.min(patch.width - sx0, dst.width - px - sx0);
    if (count <= 0) continue;
    const from = (row * patch.width + sx0) * 4;
    const to = (dy * dst.width + px + sx0) * 4;
    dst.data.set(patch.data.subarray(from, from + count * 4), to);
  }
  return dst;
}

export function isIdentity(adj: Adjustments): boolean {
  return (
    adj.brightness === 0 &&
    adj.contrast === 0 &&
    adj.saturation === 0 &&
    adj.hue === 0 &&
    adj.grayscale === 0 &&
    adj.sepia === 0 &&
    adj.invert === 0 &&
    adj.blur === 0 &&
    adj.sharpen === 0
  );
}

/**
 * Apply a full Adjustments set in a fixed, predictable order. Identity
 * steps are skipped, so isIdentity(adj) returns a plain copy.
 */
export function applyAdjustments(src: PixelBuffer, adj: Adjustments): PixelBuffer {
  let out = src;
  if (adj.hue !== 0) out = rotateHue(out, adj.hue);
  if (adj.saturation !== 0) out = adjustSaturation(out, adj.saturation);
  if (adj.brightness !== 0) out = adjustBrightness(out, adj.brightness);
  if (adj.contrast !== 0) out = adjustContrast(out, adj.contrast);
  if (adj.grayscale !== 0) out = grayscale(out, adj.grayscale);
  if (adj.sepia !== 0) out = sepia(out, adj.sepia);
  if (adj.invert !== 0) out = invert(out, adj.invert);
  if (adj.blur !== 0) out = boxBlur(out, adj.blur);
  if (adj.sharpen !== 0) out = sharpen(out, adj.sharpen);
  return out === src ? copyBuffer(src) : out;
}
