/**
 * Bring-your-own-key provider for any OpenAI-compatible HTTP API: OpenAI,
 * OpenRouter, Together, local Ollama / LM Studio, … — one configurable base
 * URL, key and model. Chat goes through /chat/completions; image generation
 * through /images/generations when the user says the endpoint supports it
 * (many chat-only endpoints don't — the capability is then declared false
 * and the panel degrades gracefully). Image EDIT is not attempted: few of
 * these endpoints share an edits API, so `capabilities.editImage` is false.
 *
 * fetch and the image decoder are injectable so tests never touch the
 * network or a canvas. API keys are only ever sent in the Authorization
 * header — never logged, never included in error messages.
 */

import type { PixelBuffer } from '../engine/filters';
import { describeDocument } from './analyze';
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
}

export interface OpenAICompatibleDeps {
  fetchFn?: typeof fetch;
  /** Turn a returned image blob into pixels (canvas decode in the browser). */
  decodeImage?: (blob: Blob) => Promise<PixelBuffer>;
}

const SYSTEM_PROMPT =
  'You are Dream, a kind and clever friend inside a simple drawing app used by ' +
  'children and beginners. Give short, warm, concrete feedback — plain words, no ' +
  'jargon, one encouraging observation and up to three doable suggestions.';

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
      editImage: false, // no shared edits API across these endpoints
    };
  }

  private url(path: string): string {
    return `${this.config.baseUrl.replace(/\/+$/, '')}${path}`;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) headers.Authorization = `Bearer ${this.config.apiKey}`;
    return headers;
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const fetchFn = this.deps.fetchFn ?? globalThis.fetch;
    if (!fetchFn) throw new Error('This browser has no fetch — is it up to date?');
    let response: Response;
    try {
      response = await fetchFn(this.url(path), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });
    } catch {
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

  async chat(messages: AIChatMessage[], context?: AIFeedbackRequest): Promise<string> {
    const wire = [{ role: 'system', content: SYSTEM_PROMPT }];
    if (context?.doc) {
      wire.push({
        role: 'system',
        content: `The drawing you are looking at: ${describeDocument(context.doc)}`,
      });
    }
    wire.push(...messages.map((m) => ({ role: m.role, content: m.text })));
    const data = (await this.post('/chat/completions', {
      model: this.config.model,
      messages: wire,
    })) as { choices?: { message?: { content?: string } }[] };
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
    const data = (await this.post('/images/generations', {
      model: this.config.imageModel ?? this.config.model,
      prompt: request.prompt,
      n: 1,
      size: `${width}x${height}`,
      response_format: 'b64_json',
    })) as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('The AI did not send back a picture. Try different words?');
    if (!this.deps.decodeImage) {
      throw new Error('No image decoder available in this environment.');
    }
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const pixels = await this.deps.decodeImage(new Blob([bytes]));
    return { pixels, prompt: request.prompt, providerId: this.id };
  }

  async editImage(_request: AIEditRequest): Promise<AIImageResult> {
    throw new Error(
      'This provider cannot edit pictures. Switch to Dream AI for edits, or generate a new one instead.',
    );
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
