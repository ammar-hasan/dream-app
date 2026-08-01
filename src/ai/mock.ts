/**
 * Deterministic mock provider: same prompt in, same placeholder out.
 * Useful for developing AI flows (and tests) without network or keys.
 */

import type {
  AIEditRequest,
  AIFeedbackRequest,
  AIFeedbackResult,
  AIImageRequest,
  AIImageResult,
  AIProvider,
} from './types';

/** Small stable string hash (FNV-1a) used to derive placeholder colors. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function placeholderSvg(prompt: string, width: number, height: number): string {
  const h = hash(prompt);
  const hue = h % 360;
  const label = prompt.trim() === '' ? 'dream' : prompt.trim().slice(0, 48);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    `<rect width="100%" height="100%" fill="hsl(${hue}, 70%, 88%)"/>`,
    `<circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="hsl(${hue}, 70%, 60%)"/>`,
    `<text x="50%" y="92%" text-anchor="middle" font-family="sans-serif" font-size="${Math.max(
      12,
      Math.floor(height / 18),
    )}" fill="hsl(${hue}, 40%, 30%)">${label.replace(/[&<>]/g, ' ')}</text>`,
    `</svg>`,
  ].join('');
}

export class MockAIProvider implements AIProvider {
  readonly id = 'mock';
  readonly name = 'Mock (offline placeholders)';

  async generateImage(request: AIImageRequest): Promise<AIImageResult> {
    const width = request.width ?? 512;
    const height = request.height ?? 512;
    const svg = placeholderSvg(request.prompt, width, height);
    return {
      image: new Blob([svg], { type: 'image/svg+xml' }),
      prompt: request.prompt,
      providerId: this.id,
    };
  }

  async editImage(request: AIEditRequest): Promise<AIImageResult> {
    // The mock cannot really edit; echo back a placeholder derived from the edit prompt.
    return this.generateImage(request);
  }

  async getFeedback(request: AIFeedbackRequest): Promise<AIFeedbackResult> {
    const seed = hash(request.question ?? 'feedback');
    return {
      summary: 'Mock feedback: your composition is off to a great start.',
      suggestions: [
        'Try a warmer accent color to draw the eye.',
        seed % 2 === 0
          ? 'Add contrast between foreground and background.'
          : 'Give the subject more breathing room.',
        'Experiment with a larger focal element.',
      ],
      providerId: this.id,
    };
  }
}
