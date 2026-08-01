/**
 * Document analysis for Dream's AI feedback. Pure functions over the real
 * document: palette histogram (vector op colors + sampled raster pixels),
 * canvas coverage, brightness/contrast and warmth heuristics — no DOM, so
 * the rule engine is fully unit-testable. `describeDocument` produces the
 * compact text summary sent to chat-capable BYOK providers (never pixels).
 */

import { hexToRgba, rgbaToHex } from '../engine/color';
import { selectionBounds, selectionUnionBounds } from '../engine/selection';
import type { DreamDocument, Layer, Operation, Rect } from '../engine/types';
import type { AISuggestion } from './types';

export interface PaletteEntry {
  color: string;
  /** Share of all sampled color weight, 0..1. */
  share: number;
}

export interface DocumentAnalysis {
  layerCount: number;
  hiddenLayerCount: number;
  opCount: number;
  /** Fraction of the canvas covered by content bounds, 0..1. */
  coverage: number;
  palette: PaletteEntry[];
  /** Average perceived brightness of the palette, 0..255. */
  meanLuma: number;
  /** Luma spread (standard deviation); low values look flat. */
  contrast: number;
  /** -1 = cool/blue, +1 = warm/red-orange. */
  warmth: number;
  hasText: boolean;
}

interface ColorSample {
  r: number;
  g: number;
  b: number;
  weight: number;
}

/** Rec. 709 luma, matching engine/filters. */
function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Weight a vector op's color by the canvas area it covers. */
function opColorSample(op: Operation, docArea: number): ColorSample | null {
  if (op.kind === 'image' || op.kind === 'fill') return null;
  const rgba = hexToRgba(op.color);
  if (!rgba) return null;
  const b = selectionBounds(op);
  const weight = Math.max(1, (b.width * b.height) / Math.max(1, docArea));
  return { r: rgba.r, g: rgba.g, b: rgba.b, weight };
}

/** Sample a raster op's pixels (strided), weighted by pixel count. */
function rasterColorSamples(op: Operation): ColorSample[] {
  if (op.kind !== 'image' && op.kind !== 'fill') return [];
  const { data } = op.patch;
  const pixelCount = data.length / 4;
  const stride = Math.max(1, Math.floor(pixelCount / 512));
  const samples: ColorSample[] = [];
  for (let p = 0; p < pixelCount; p += stride) {
    const i = p * 4;
    if (data[i + 3] < 16) continue; // skip transparent pixels
    samples.push({ r: data[i], g: data[i + 1], b: data[i + 2], weight: 1 });
  }
  return samples;
}

/** Fraction of the canvas covered by content, measured on a coarse grid. */
function coverageOf(doc: DreamDocument): number {
  const COLS = 48;
  const ROWS = Math.max(1, Math.round((COLS * doc.height) / Math.max(1, doc.width)));
  const cells = new Uint8Array(COLS * ROWS);
  for (const layer of doc.layers) {
    if (!layer.visible) continue;
    for (const op of layer.operations) {
      const b = selectionBounds(op);
      const x0 = Math.max(0, Math.floor((b.x / doc.width) * COLS));
      const y0 = Math.max(0, Math.floor((b.y / doc.height) * ROWS));
      const x1 = Math.min(COLS - 1, Math.floor(((b.x + b.width) / doc.width) * COLS));
      const y1 = Math.min(ROWS - 1, Math.floor(((b.y + b.height) / doc.height) * ROWS));
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) cells[y * COLS + x] = 1;
      }
    }
  }
  let covered = 0;
  for (const c of cells) covered += c;
  return covered / cells.length;
}

export function analyzeDocument(doc: DreamDocument): DocumentAnalysis {
  const docArea = doc.width * doc.height;
  const samples: ColorSample[] = [];
  let opCount = 0;
  let hiddenLayerCount = 0;
  let hasText = false;

  for (const layer of doc.layers) {
    if (!layer.visible) {
      hiddenLayerCount += 1;
      continue;
    }
    opCount += layer.operations.length;
    for (const op of layer.operations) {
      if (op.kind === 'text') hasText = true;
      const vector = opColorSample(op, docArea);
      if (vector) samples.push(vector);
      else samples.push(...rasterColorSamples(op));
    }
  }

  // The canvas background always contributes — it is part of what you see.
  const bg = hexToRgba(doc.background);
  if (bg) samples.push({ r: bg.r, g: bg.g, b: bg.b, weight: Math.max(0.05, 1 - coverageOf(doc)) });

  const totalWeight = samples.reduce((sum, s) => sum + s.weight, 0);
  const buckets = new Map<string, number>();
  let meanLuma = 0;
  let warmth = 0;
  for (const s of samples) {
    const share = s.weight / Math.max(1e-9, totalWeight);
    buckets.set(rgbaToHex(s.r, s.g, s.b), (buckets.get(rgbaToHex(s.r, s.g, s.b)) ?? 0) + share);
    meanLuma += luma(s.r, s.g, s.b) * share;
    warmth += ((s.r - s.b) / 255) * share;
  }
  let variance = 0;
  for (const s of samples) {
    const share = s.weight / Math.max(1e-9, totalWeight);
    const d = luma(s.r, s.g, s.b) - meanLuma;
    variance += d * d * share;
  }

  const palette = [...buckets.entries()]
    .map(([color, share]) => ({ color, share }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 5);

  return {
    layerCount: doc.layers.length,
    hiddenLayerCount,
    opCount,
    coverage: coverageOf(doc),
    palette,
    meanLuma,
    contrast: Math.sqrt(variance),
    warmth,
    hasText,
  };
}

/** Compact one-paragraph description for chat providers — no pixels. */
export function describeDocument(doc: DreamDocument): string {
  const a = analyzeDocument(doc);
  const parts = [
    `${doc.width}x${doc.height} canvas, background ${doc.background}`,
    `${a.layerCount} layer${a.layerCount === 1 ? '' : 's'} (${a.hiddenLayerCount} hidden), ${a.opCount} objects`,
    `content covers ~${Math.round(a.coverage * 100)}% of the canvas`,
  ];
  if (a.palette.length > 0) {
    parts.push(
      `main colors: ${a.palette.map((p) => `${p.color} (${Math.round(p.share * 100)}%)`).join(', ')}`,
    );
  }
  const layers = doc.layers.map(
    (l: Layer) =>
      `"${l.name}" (${l.operations.length} ops, opacity ${Math.round(l.opacity * 100)}%${l.visible ? '' : ', hidden'})`,
  );
  parts.push(`layers: ${layers.join('; ')}`);
  return parts.join('. ');
}

/**
 * The edit region for the AI panel's "selected area only" toggle: the
 * selection's union bounds, rounded and clamped to the document. Returns
 * null when there is no usable selection.
 */
export function editRegionForSelection(
  doc: DreamDocument,
  layer: Layer | undefined,
  selection: string[],
): Rect | null {
  if (!layer || selection.length === 0) return null;
  const bounds = selectionUnionBounds(layer.operations, selection);
  if (!bounds) return null;
  const x = Math.max(0, Math.floor(bounds.x));
  const y = Math.max(0, Math.floor(bounds.y));
  const width = Math.min(doc.width - x, Math.ceil(bounds.width));
  const height = Math.min(doc.height - y, Math.ceil(bounds.height));
  if (width < 1 || height < 1) return null;
  return { x, y, width, height };
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/**
 * Rule-based feedback over the real document analysis. Friendly, concrete,
 * and — where Dream can do it in one click — carrying an action the panel
 * renders as an "Apply" button. Deterministic: same document, same advice.
 */
export function feedbackForAnalysis(
  a: DocumentAnalysis,
  doc: DreamDocument,
  selection: Rect | null = null,
): { summary: string; suggestions: AISuggestion[] } {
  if (a.opCount === 0) {
    return {
      summary:
        'Your canvas is still blank — the best place to start! Tell me a dream in the Create tab and I will sketch it, or just start drawing.',
      suggestions: [],
    };
  }

  const mood =
    a.warmth > 0.1 ? 'warm and cosy' : a.warmth < -0.1 ? 'cool and calm' : 'nicely balanced';
  const bits = [
    `I see ${a.opCount} ${a.opCount === 1 ? 'mark' : 'marks'} on ${a.layerCount} ${a.layerCount === 1 ? 'layer' : 'layers'}, covering about ${pct(a.coverage)} of the canvas.`,
    `The colors feel ${mood}.`,
  ];
  if (a.hiddenLayerCount > 0) {
    bits.push(
      `${a.hiddenLayerCount} ${a.hiddenLayerCount === 1 ? 'layer is' : 'layers are'} hidden — I can only see what you can see.`,
    );
  }
  const summary = bits.join(' ');

  const suggestions: AISuggestion[] = [];
  if (a.coverage < 0.12) {
    suggestions.push({
      text: 'There is lots of empty space. A big shape or a soft background color would give your idea a home.',
    });
  }
  if (a.contrast < 22) {
    suggestions.push({
      text: 'Everything is a similar brightness, so it looks a little flat. A contrast boost will make it pop.',
      action: { kind: 'adjust', adjustments: { contrast: 30 } },
    });
  }
  if (a.warmth < -0.08) {
    suggestions.push({
      text: 'It feels a little chilly. A warmer palette would make it cosier.',
      action: { kind: 'adjust', adjustments: { sepia: 25, saturation: 10, brightness: 5 } },
    });
  } else if (a.warmth > 0.3) {
    suggestions.push({
      text: 'Lots of warm colors! A cool accent would give the eye somewhere to rest.',
      action: { kind: 'adjust', adjustments: { hue: -15, saturation: 10, brightness: 5 } },
    });
  }
  if (a.meanLuma < 70) {
    suggestions.push({
      text: 'It is quite dark overall — a little brightness would help the details shine.',
      action: { kind: 'adjust', adjustments: { brightness: 20 } },
    });
  }
  if (selection) {
    const cx = selection.x + selection.width / 2;
    const cy = selection.y + selection.height / 2;
    const offCenter =
      Math.abs(cx - doc.width / 2) > doc.width * 0.1 ||
      Math.abs(cy - doc.height / 2) > doc.height * 0.1;
    if (offCenter) {
      suggestions.push({
        text: 'The part you picked sits off to one side. Centering it would give it more presence.',
        action: { kind: 'center-selection' },
      });
    }
  }
  if (a.layerCount === 1 && a.opCount >= 5) {
    suggestions.push({
      text: 'Everything lives on one layer. Putting new things on their own layer makes them easier to move and fix later.',
    });
  }
  if (a.coverage > 0.85) {
    suggestions.push({
      text: 'The canvas is very full. Leaving some breathing room around the main idea helps it stand out.',
    });
  }
  if (suggestions.length === 0) {
    suggestions.push({ text: 'Honestly? This is looking lovely. Keep going!' });
  }
  return { summary, suggestions };
}
