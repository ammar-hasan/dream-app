/**
 * Bring-your-own-key provider for any OpenAI-compatible HTTP API: OpenAI,
 * OpenRouter, Together, local Ollama / LM Studio, … — one configurable base
 * URL, key and model. Chat goes through /chat/completions; image generation
 * through /images/generations when the user says the endpoint supports it
 * (many chat-only endpoints don't — the capability is then declared false
 * and the panel degrades gracefully). Image editing goes through
 * /images/edits only when the user explicitly configures an edits model.
 *
 * fetch and the image codecs are injectable so tests never touch the
 * network or a canvas. API keys are only ever sent in the Authorization
 * header — never logged, never included in error messages.
 */

import type { PixelBuffer } from '../engine/filters';
import { resizeBufferNearest } from '../engine/transform';
import { describeDocument } from './analyze';
import { buildEditMask } from './inpaint';
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

export interface OpenAICompatibleConfig {
  /** e.g. https://api.openai.com/v1, https://openrouter.ai/api/v1, http://localhost:11434/v1 */
  baseUrl: string;
  model: string;
  apiKey?: string;
  /** Separate model for /images/generations; defaults to `model`. */
  imageModel?: string;
  /** Declare /images/generations support (chat-only endpoints: false). */
  supportsImages?: boolean;
  /** Model for /images/edits; when absent, edit capability stays disabled. */
  editsModel?: string;
}

export interface OpenAICompatibleDeps {
  fetchFn?: typeof fetch;
  /** Turn a returned image blob into pixels (canvas decode in the browser). */
  decodeImage?: (blob: Blob) => Promise<PixelBuffer>;
  /** Turn pixels into a PNG blob for /images/edits. */
  encodeImage?: (pixels: PixelBuffer) => Promise<Blob>;
}

const SYSTEM_PROMPT =
  'You are Dream, a kind and clever friend inside a simple drawing app used by ' +
  'children and beginners. Give short, warm, concrete feedback — plain words, no ' +
  'jargon, one encouraging observation and up to three doable suggestions.';

/**
 * GPT Image 2 accepts flexible sizes, but both edges must be multiples of 16
 * and the image must contain at least 655,360 pixels. A short edge of 816 is
 * the smallest multiple of 16 that clears that floor for a square; preserve
 * the requested aspect from there (clamped to the API's 1:3–3:1 range).
 */
export function gptImage2Size(width: number, height: number): string {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1024;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1024;
  const ratio = Math.max(1 / 3, Math.min(3, safeWidth / safeHeight));
  const shortEdge = 816;
  if (ratio >= 1) {
    return `${Math.round((shortEdge * ratio) / 16) * 16}x${shortEdge}`;
  }
  return `${shortEdge}x${Math.round(shortEdge / ratio / 16) * 16}`;
}

function imageGenerationSize(model: string, width: number, height: number): string {
  const ratio = width / height;
  if (model.startsWith('gpt-image-2')) return gptImage2Size(width, height);
  if (model.startsWith('gpt-image')) {
    if (ratio > 1.15) return '1536x1024';
    if (ratio < 0.87) return '1024x1536';
    return '1024x1024';
  }
  if (model === 'dall-e-3') {
    if (ratio > 1.15) return '1792x1024';
    if (ratio < 0.87) return '1024x1792';
    return '1024x1024';
  }
  return `${width}x${height}`;
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly id = 'openai-compatible';
  readonly name = 'My own AI (OpenAI-compatible)';
  readonly capabilities: AICapabilities;

  constructor(
    readonly config: OpenAICompatibleConfig,
    private deps: OpenAICompatibleDeps = {},
  ) {
    this.capabilities = {
      chat: true,
      generateImage: !!config.supportsImages,
      editImage: !!config.editsModel?.trim(),
    };
  }

  private url(path: string): string {
    return `${this.config.baseUrl.replace(/\/+$/, '')}${path}`;
  }

  private headers(json: boolean): Record<string, string> {
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (this.config.apiKey) headers.Authorization = `Bearer ${this.config.apiKey}`;
    return headers;
  }

  private async request(
    path: string,
    body: BodyInit,
    json: boolean,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const fetchFn = this.deps.fetchFn ?? globalThis.fetch;
    if (!fetchFn) throw new Error('This browser has no fetch — is it up to date?');
    let response: Response;
    try {
      response = await fetchFn(this.url(path), {
        method: 'POST',
        headers: this.headers(json),
        body,
        signal,
      });
    } catch (error) {
      if (signal?.aborted || (error as { name?: unknown })?.name === 'AbortError') throw error;
      throw new Error(
        `Could not reach ${this.config.baseUrl} — is the URL right and the app running?`,
      );
    }
    if (!response.ok) {
      const note =
        response.status === 401 || response.status === 403
          ? 'the API key was rejected — check it and try again'
          : response.status === 404
            ? 'that endpoint was not found — check the base URL and model name'
            : `it answered with status ${response.status}`;
      throw new Error(`The AI service said no: ${note}.`);
    }
    return response.json();
  }

  private post(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
    return this.request(path, JSON.stringify(body), true, signal);
  }

  private postForm(path: string, body: FormData, signal?: AbortSignal): Promise<unknown> {
    return this.request(path, body, false, signal);
  }

  async chat(messages: AIChatMessage[], context?: AIFeedbackRequest): Promise<string> {
    const wire = [{ role: 'system', content: SYSTEM_PROMPT }];
    if (context?.doc) {
      wire.push({
        role: 'system',
        content: `The drawing you are looking at: ${describeDocument(context.doc)}`,
      });
    }
    wire.push(...messages.map((m) => ({ role: m.role, content: m.text })));
    const data = (await this.post(
      '/chat/completions',
      {
        model: this.config.model,
        messages: wire,
      },
      context?.signal,
    )) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('The AI answered, but said nothing. Try again?');
    return text;
  }

  async generateImage(request: AIImageRequest): Promise<AIImageResult> {
    if (!this.capabilities.generateImage) {
      throw new Error(
        'This provider is set up for chat only — turn on image support or switch to Dream AI.',
      );
    }
    const width = Math.round(request.width ?? 1024);
    const height = Math.round(request.height ?? 1024);
    const officialOpenAI = /^https:\/\/api\.openai\.com(?:\/|$)/i.test(this.config.baseUrl);
    const model =
      this.config.imageModel?.trim() || (officialOpenAI ? 'gpt-image-2' : this.config.model);
    const gptImage = model.startsWith('gpt-image');
    const data = (await this.post(
      '/images/generations',
      {
        model,
        prompt: request.prompt,
        n: 1,
        size: imageGenerationSize(model, width, height),
        ...(gptImage ? { quality: 'low' } : { response_format: 'b64_json' }),
      },
      request.signal,
    )) as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('The AI did not send back a picture. Try different words?');
    if (!this.deps.decodeImage) {
      throw new Error('No image decoder available in this environment.');
    }
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    let pixels = await this.deps.decodeImage(new Blob([bytes]));
    if (pixels.width !== width || pixels.height !== height) {
      pixels = resizeBufferNearest(pixels, width, height);
    }
    return { pixels, prompt: request.prompt, providerId: this.id };
  }

  async editImage(request: AIEditRequest): Promise<AIImageResult> {
    const model = this.config.editsModel?.trim();
    if (!model) {
      throw new Error(
        'This provider cannot edit pictures. Add an edits model in Settings, switch to Dream AI, or generate a new one instead.',
      );
    }
    if (!this.deps.encodeImage) {
      throw new Error('No image encoder available in this environment.');
    }
    if (!this.deps.decodeImage) {
      throw new Error('No image decoder available in this environment.');
    }

    const mask = buildEditMask(request.image, request.mask);
    const [imageBlob, maskBlob] = await Promise.all([
      this.deps.encodeImage(request.image),
      this.deps.encodeImage(mask),
    ]);
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', request.prompt);
    // Current GPT Image models accept arrays of reference images. Legacy
    // OpenAI-compatible edit endpoints use the singular image field.
    form.append(model.startsWith('gpt-image') ? 'image[]' : 'image', imageBlob, 'image.png');
    form.append('mask', maskBlob, 'mask.png');
    if (model.startsWith('gpt-image')) {
      form.append('size', 'auto');
    } else {
      const edge = Math.max(request.image.width, request.image.height);
      form.append('size', edge <= 256 ? '256x256' : edge <= 512 ? '512x512' : '1024x1024');
      form.append('response_format', 'b64_json');
    }

    const data = (await this.postForm('/images/edits', form, request.signal)) as {
      data?: { b64_json?: string }[];
    };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('The AI did not send back a picture. Try different words?');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    let pixels = await this.deps.decodeImage(new Blob([bytes]));
    if (pixels.width !== request.image.width || pixels.height !== request.image.height) {
      pixels = resizeBufferNearest(pixels, request.image.width, request.image.height);
    }
    return { pixels, prompt: request.prompt, providerId: this.id };
  }

  async getFeedback(request: AIFeedbackRequest): Promise<AIFeedbackResult> {
    const question =
      request.question ??
      'Please look at my design and tell me what you think, with ideas to make it better.';
    const reply = await this.chat([{ role: 'user', text: question }], request);
    return { summary: reply, suggestions: [], providerId: this.id };
  }

  /** Settings panel helper: one cheap round-trip to validate URL/key/model. */
  async testConnection(): Promise<void> {
    await this.chat([{ role: 'user', text: 'Say hello in one word.' }]);
  }
}
