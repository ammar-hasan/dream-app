/**
 * Dream's built-in provider: free, offline and deterministic. Same prompt
 * in, same picture out. Image generation paints little procedural scenes
 * (gradients, sun/moon, stars, hills, trees) seeded by the prompt — no
 * network, no DOM. Edits map prompt keywords onto the engine's real
 * filters; feedback runs the rule engine in analyze.ts over the actual
 * document.
 */

import {
  applyAdjustments,
  blitRegion,
  extractRegion,
  type Adjustments,
  type PixelBuffer,
} from '../engine/filters';
import { hexToRgba } from '../engine/color';
import { analyzeDocument, describeDocument, feedbackForAnalysis } from './analyze';
import type {
  AICapabilities,
  AIChatMessage,
  AIEditRequest,
  AIFeedbackRequest,
  AIFeedbackResult,
  AIImageRequest,
  AIImageResult,
  AIProvider,
} from './types';

/** Small stable string hash (FNV-1a) used to seed the scene generator. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32). */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  const c = hexToRgba(hex) ?? { r: 0, g: 0, b: 0 };
  return [c.r, c.g, c.b];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Multi-stop vertical gradient: stops as [offset 0..1, color]. */
type Gradient = [number, Rgb][];

function gradientAt(stops: Gradient, t: number): Rgb {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i += 1) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      return lerpRgb(c0, c1, (t - t0) / Math.max(1e-6, t1 - t0));
    }
  }
  return stops[stops.length - 1][1];
}

interface Scene {
  sky: Gradient;
  /** [color, glow strength 0..1]; glow 0 still paints the disc. */
  body: { color: Rgb; glow: number; moon: boolean };
  /** Hill layers back-to-front: [base height 0..1 from top, amplitude, color]. */
  hills: [number, number, Rgb][];
  stars: number;
  trees: boolean;
}

const SCENES: { match: RegExp; scene: Scene }[] = [
  {
    match: /night|star|moon|space|galaxy|midnight/i,
    scene: {
      sky: [
        [0, rgb('#0b1026')],
        [0.55, rgb('#1f2a52')],
        [0.8, rgb('#3a4a7a')],
        [1, rgb('#141c38')],
      ],
      body: { color: rgb('#f4f1de'), glow: 0.55, moon: true },
      hills: [
        [0.68, 0.05, rgb('#1c2a45')],
        [0.78, 0.07, rgb('#14203a')],
        [0.9, 0.06, rgb('#0e1830')],
      ],
      stars: 140,
      trees: false,
    },
  },
  {
    match: /sunset|sunrise|dusk|dawn|evening/i,
    scene: {
      sky: [
        [0, rgb('#2d1b4e')],
        [0.45, rgb('#a34a6e')],
        [0.7, rgb('#ff8c5a')],
        [0.85, rgb('#ffd29d')],
        [1, rgb('#7a3b2e')],
      ],
      body: { color: rgb('#ffd75e'), glow: 0.7, moon: false },
      hills: [
        [0.72, 0.05, rgb('#5a2e4a')],
        [0.82, 0.06, rgb('#3f2038')],
        [0.92, 0.05, rgb('#2a1428')],
      ],
      stars: 20,
      trees: false,
    },
  },
  {
    match: /forest|tree|woods|jungle|pine/i,
    scene: {
      sky: [
        [0, rgb('#bfe3c0')],
        [0.6, rgb('#e8f7e8')],
        [1, rgb('#cdeccb')],
      ],
      body: { color: rgb('#fff3b0'), glow: 0.4, moon: false },
      hills: [
        [0.62, 0.05, rgb('#9fd08a')],
        [0.74, 0.06, rgb('#6fb26b')],
        [0.88, 0.05, rgb('#4c8f52')],
      ],
      stars: 0,
      trees: true,
    },
  },
  {
    match: /ocean|sea|beach|water|wave|island/i,
    scene: {
      sky: [
        [0, rgb('#aee3f5')],
        [0.55, rgb('#eafaff')],
        [0.62, rgb('#fdf3d8')],
        [0.65, rgb('#2f7fc1')],
        [1, rgb('#17558f')],
      ],
      body: { color: rgb('#ffd75e'), glow: 0.5, moon: false },
      hills: [],
      stars: 0,
      trees: false,
    },
  },
  {
    match: /mountain|snow|winter|alps|peak/i,
    scene: {
      sky: [
        [0, rgb('#cfd9e8')],
        [0.6, rgb('#f4f8ff')],
        [1, rgb('#e6edf6')],
      ],
      body: { color: rgb('#fdf6d8'), glow: 0.35, moon: false },
      hills: [
        [0.55, 0.14, rgb('#d3dfee')],
        [0.7, 0.12, rgb('#e9f0f9')],
        [0.85, 0.08, rgb('#ffffff')],
      ],
      stars: 0,
      trees: false,
    },
  },
  {
    match: /desert|cactus|dune|sand/i,
    scene: {
      sky: [
        [0, rgb('#ffe3b3')],
        [0.55, rgb('#fff6e0')],
        [1, rgb('#f7d9a0')],
      ],
      body: { color: rgb('#ffb84d'), glow: 0.65, moon: false },
      hills: [
        [0.66, 0.05, rgb('#e8b871')],
        [0.78, 0.06, rgb('#d9a25b')],
        [0.9, 0.05, rgb('#c78d49')],
      ],
      stars: 0,
      trees: false,
    },
  },
];

const DAY_SCENE: Scene = {
  sky: [
    [0, rgb('#7ec8f7')],
    [0.6, rgb('#dff3ff')],
    [1, rgb('#eafbf3')],
  ],
  body: { color: rgb('#ffd75e'), glow: 0.5, moon: false },
  hills: [
    [0.66, 0.05, rgb('#a8d88f')],
    [0.78, 0.06, rgb('#7bbd70')],
    [0.9, 0.05, rgb('#5da35f')],
  ],
  stars: 0,
  trees: false,
};

/** Paint one deterministic scene. Same seed + size → same pixels. */
export function generateScenePixels(prompt: string, width: number, height: number): PixelBuffer {
  const rand = prng(hash(`${prompt.trim().toLowerCase()}|${width}x${height}`));
  const scene = SCENES.find((s) => s.match.test(prompt))?.scene ?? DAY_SCENE;
  const data = new Uint8ClampedArray(width * height * 4);

  // Sky + celestial body glow in one pass.
  const bodyX = width * (0.25 + rand() * 0.5);
  const bodyY = height * (0.14 + rand() * 0.18);
  const bodyR = Math.min(width, height) * (0.07 + rand() * 0.05);
  for (let y = 0; y < height; y += 1) {
    const sky = gradientAt(scene.sky, y / Math.max(1, height - 1));
    for (let x = 0; x < width; x += 1) {
      let [r, g, b] = sky;
      const dist = Math.hypot(x - bodyX, y - bodyY);
      const glow = Math.max(0, 1 - dist / (bodyR * 3.5));
      const k = glow * glow * scene.body.glow;
      r = lerp(r, scene.body.color[0], k);
      g = lerp(g, scene.body.color[1], k);
      b = lerp(b, scene.body.color[2], k);
      const i = (y * width + x) * 4;
      data[i] = Math.round(r);
      data[i + 1] = Math.round(g);
      data[i + 2] = Math.round(b);
      data[i + 3] = 255;
    }
  }

  const put = (x: number, y: number, c: Rgb, alpha = 1) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (Math.floor(y) * width + Math.floor(x)) * 4;
    data[i] = Math.round(lerp(data[i], c[0], alpha));
    data[i + 1] = Math.round(lerp(data[i + 1], c[1], alpha));
    data[i + 2] = Math.round(lerp(data[i + 2], c[2], alpha));
  };

  // Stars (before the body so the moon glows over them).
  for (let s = 0; s < scene.stars; s += 1) {
    const x = rand() * width;
    const y = rand() * height * 0.6;
    const bright = 0.35 + rand() * 0.65;
    const size = rand() < 0.85 ? 1 : 2;
    for (let dx = 0; dx < size; dx += 1)
      for (let dy = 0; dy < size; dy += 1) put(x + dx, y + dy, [255, 255, 255], bright);
  }

  // Celestial disc (with a soft edge), plus a moon shadow for the crescent look.
  for (let y = Math.max(0, bodyY - bodyR - 2); y < Math.min(height, bodyY + bodyR + 2); y += 1) {
    for (let x = Math.max(0, bodyX - bodyR - 2); x < Math.min(width, bodyX + bodyR + 2); x += 1) {
      const dist = Math.hypot(x - bodyX, y - bodyY);
      const edge = Math.min(1, Math.max(0, bodyR + 0.5 - dist));
      if (edge <= 0) continue;
      if (scene.body.moon) {
        const shadow = Math.hypot(x - (bodyX + bodyR * 0.45), y - (bodyY - bodyR * 0.25));
        const k = shadow < bodyR * 0.85 ? 0.35 : 1;
        put(
          x,
          y,
          [scene.body.color[0] * k, scene.body.color[1] * k, scene.body.color[2] * k],
          edge,
        );
      } else {
        put(x, y, scene.body.color, edge);
      }
    }
  }

  // Hills, back to front; each silhouette is a sum of two sines.
  scene.hills.forEach(([base, amp, color], layer) => {
    const f1 = (2 + rand() * 3) / width;
    const f2 = (5 + rand() * 6) / width;
    const p1 = rand() * Math.PI * 2;
    const p2 = rand() * Math.PI * 2;
    const surface: number[] = new Array(width);
    for (let x = 0; x < width; x += 1) {
      surface[x] =
        height * base +
        Math.sin(x * f1 * Math.PI * 2 + p1) * height * amp +
        Math.sin(x * f2 * Math.PI * 2 + p2) * height * amp * 0.5;
    }
    for (let x = 0; x < width; x += 1) {
      for (let y = Math.max(0, Math.floor(surface[x])); y < height; y += 1) put(x, y, color);
    }
    // Trees stand on the front hill of forest scenes.
    if (scene.trees && layer === scene.hills.length - 1) {
      const treeColor: Rgb = [30, 74, 48];
      const count = Math.max(3, Math.floor(width / 90));
      for (let t = 0; t < count; t += 1) {
        const tx = Math.floor(rand() * width);
        const ground = surface[Math.min(width - 1, Math.max(0, tx))];
        const th = height * (0.08 + rand() * 0.07);
        for (let dy = 0; dy < th; dy += 1) {
          const half = (dy / th) * th * 0.45;
          for (let dx = -half; dx <= half; dx += 1) put(tx + dx, ground - th + dy, treeColor);
        }
        for (let dy = 0; dy < th * 0.15; dy += 1) put(tx, ground - dy, [92, 64, 44]);
      }
    }
  });

  return { data, width, height };
}

/** Prompt keyword → filter combo for mock edits (uses the real engine filters). */
const EDIT_RULES: { match: RegExp; adjustments: Partial<Adjustments> }[] = [
  { match: /black\s*and\s*white|gr[ae]y|mono/i, adjustments: { grayscale: 100 } },
  { match: /vintage|old|retro|sepia/i, adjustments: { sepia: 70, contrast: 15, brightness: -5 } },
  {
    match: /warm|sunset|cosy|cozy|golden/i,
    adjustments: { sepia: 25, saturation: 10, brightness: 5 },
  },
  { match: /cool|cold|blue|winter|icy/i, adjustments: { hue: -15, saturation: 10, brightness: 5 } },
  { match: /bright|lighten|sunnier/i, adjustments: { brightness: 25 } },
  { match: /dark|night|moody|dim/i, adjustments: { brightness: -25 } },
  { match: /contrast|pop|punch/i, adjustments: { contrast: 30 } },
  { match: /blur|soft|dreamy|fog/i, adjustments: { blur: 3 } },
  { match: /sharp|crisp|clear/i, adjustments: { sharpen: 60 } },
  { match: /invert|negative/i, adjustments: { invert: 100 } },
  { match: /colorful|vivid|saturat/i, adjustments: { saturation: 40 } },
  { match: /hue|psychedelic|rainbow/i, adjustments: { hue: 120, saturation: 20 } },
];

const DEFAULT_EDIT: Partial<Adjustments> = { saturation: 15, brightness: 5, sepia: 10 };

export class MockAIProvider implements AIProvider {
  readonly id = 'mock';
  readonly name = 'Dream AI (built-in, free)';
  readonly capabilities: AICapabilities = {
    generateImage: true,
    editImage: true,
    chat: true,
  };

  async generateImage(request: AIImageRequest): Promise<AIImageResult> {
    const width = Math.max(8, Math.round(request.width ?? 512));
    const height = Math.max(8, Math.round(request.height ?? 512));
    return {
      pixels: generateScenePixels(request.prompt, width, height),
      prompt: request.prompt,
      providerId: this.id,
    };
  }

  async editImage(request: AIEditRequest): Promise<AIImageResult> {
    const rule = EDIT_RULES.find((r) => r.match.test(request.prompt));
    const adjustments = { ...DEFAULT_EDIT, ...(rule?.adjustments ?? {}) };
    const edited = applyAdjustments(request.image, { ...zeroAdjustments(), ...adjustments });
    if (request.mask) {
      // Only the masked region changes; the rest keeps the original pixels.
      const masked = {
        data: new Uint8ClampedArray(request.image.data),
        width: request.image.width,
        height: request.image.height,
      };
      const region = {
        x: request.mask.x,
        y: request.mask.y,
        width: Math.min(request.mask.width, edited.width),
        height: Math.min(request.mask.height, edited.height),
      };
      blitRegion(masked, extractRegion(edited, region), region.x, region.y);
      return { pixels: masked, prompt: request.prompt, providerId: this.id };
    }
    return { pixels: edited, prompt: request.prompt, providerId: this.id };
  }

  async chat(messages: AIChatMessage[], context?: AIFeedbackRequest): Promise<string> {
    const last = messages[messages.length - 1]?.text ?? '';
    if (context?.doc) {
      const { summary } = feedbackForAnalysis(analyzeDocument(context.doc), context.doc, null);
      return `${summary} You said: “${last}” — lovely direction. ${describeDocument(context.doc)}`;
    }
    return 'I am Dream’s built-in helper — I work offline and never run out of kindness. Tell me what you want to make!';
  }

  async getFeedback(request: AIFeedbackRequest): Promise<AIFeedbackResult> {
    const analysis = analyzeDocument(request.doc);
    const { summary, suggestions } = feedbackForAnalysis(
      analysis,
      request.doc,
      request.selection ?? null,
    );
    return { summary, suggestions, providerId: this.id };
  }
}

function zeroAdjustments(): Adjustments {
  return {
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
}
