/** OpenAI-compatible provider: request construction, capabilities, errors. */

import { describe, expect, it, vi } from 'vitest';
import { createDocument } from '../engine/document';
import { gptImage2Size, OpenAICompatibleProvider } from './openai';

interface FetchCall {
  url: string;
  init: RequestInit;
}

function fakeFetch(payload: unknown, ok = true, status = 200) {
  const calls: FetchCall[] = [];
  const fetchFn = vi.fn(async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return {
      ok,
      status,
      json: async () => payload,
    } as Response;
  });
  return { calls, fetchFn: fetchFn as unknown as typeof fetch };
}

const chatPayload = { choices: [{ message: { content: ' Looking lovely! ' } }] };

describe('OpenAICompatibleProvider.chat', () => {
  it('posts an OpenAI-shaped chat request with the bearer key', async () => {
    const { calls, fetchFn } = fakeFetch(chatPayload);
    const provider = new OpenAICompatibleProvider(
      { baseUrl: 'https://openrouter.ai/api/v1/', model: 'some/model', apiKey: 'sk-test' },
      { fetchFn },
    );
    const reply = await provider.chat([{ role: 'user', text: 'How is my drawing?' }]);
    expect(reply).toBe('Looking lovely!');

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(calls[0].init.method).toBe('POST');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(String(calls[0].init.body)) as {
      model: string;
      messages: { role: string; content: string }[];
    };
    expect(body.model).toBe('some/model');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'How is my drawing?' });
  });

  it('includes a text-only document description when feedback context is given', async () => {
    const { calls, fetchFn } = fakeFetch(chatPayload);
    const provider = new OpenAICompatibleProvider(
      { baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
      { fetchFn },
    );
    const doc = createDocument({ width: 100, height: 80 });
    await provider.getFeedback({ doc });
    const body = JSON.parse(String(calls[0].init.body)) as {
      messages: { role: string; content: string }[];
    };
    expect(body.messages.some((m) => m.content.includes('100x80'))).toBe(true);
  });

  it('turns HTTP errors into friendly messages that never leak the key', async () => {
    const { fetchFn } = fakeFetch({}, false, 401);
    const provider = new OpenAICompatibleProvider(
      { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: 'sk-secret-123' },
      { fetchFn },
    );
    await expect(provider.chat([{ role: 'user', text: 'hi' }])).rejects.toThrow(/key/i);
    await provider.chat([{ role: 'user', text: 'hi' }]).catch((e: Error) => {
      expect(e.message).not.toContain('sk-secret-123');
    });
  });

  it('explains unreachable endpoints without technical jargon', async () => {
    const fetchFn = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const provider = new OpenAICompatibleProvider(
      { baseUrl: 'http://localhost:9999/v1', model: 'x' },
      { fetchFn },
    );
    await expect(provider.chat([{ role: 'user', text: 'hi' }])).rejects.toThrow(/could not reach/i);
  });
});

describe('OpenAICompatibleProvider image capabilities', () => {
  it('maps canvas proportions to valid efficient GPT Image 2 sizes', () => {
    expect(gptImage2Size(800, 600)).toBe('1088x816');
    expect(gptImage2Size(600, 800)).toBe('816x1088');
    expect(gptImage2Size(100, 100)).toBe('816x816');
    expect(gptImage2Size(4000, 500)).toBe('2448x816');
  });

  it('declares no image generation for chat-only endpoints and refuses politely', async () => {
    const provider = new OpenAICompatibleProvider(
      { baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
      { fetchFn: fakeFetch(chatPayload).fetchFn },
    );
    expect(provider.capabilities).toEqual({ chat: true, generateImage: false, editImage: false });
    await expect(provider.generateImage({ prompt: 'a cat' })).rejects.toThrow(/chat only/i);
  });

  it('uses GPT Image 2 correctly for official OpenAI and normalizes it to the canvas', async () => {
    const pixels = { data: new Uint8ClampedArray([1, 2, 3, 255]), width: 1, height: 1 };
    const decodeImage = vi.fn(async () => pixels);
    // A 1x1 transparent PNG (not decoded for real — decodeImage is injected).
    const b64 = btoa('fakepngbytes');
    const { calls, fetchFn } = fakeFetch({ data: [{ b64_json: b64 }] });
    const provider = new OpenAICompatibleProvider(
      { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', supportsImages: true },
      { fetchFn, decodeImage },
    );
    const result = await provider.generateImage({ prompt: 'a cat', width: 512, height: 256 });
    expect(calls[0].url).toBe('https://api.openai.com/v1/images/generations');
    const body = JSON.parse(String(calls[0].init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: 'gpt-image-2',
      size: '1632x816',
      quality: 'low',
      prompt: 'a cat',
    });
    expect(body).not.toHaveProperty('response_format');
    expect(body.prompt).toBe('a cat');
    expect(decodeImage).toHaveBeenCalledOnce();
    expect(result.pixels).toMatchObject({ width: 512, height: 256 });
    expect(result.pixels.data.slice(0, 4)).toEqual(pixels.data);
  });

  it('preserves arbitrary sizes and response_format for compatible non-GPT routes', async () => {
    const pixels = {
      data: new Uint8ClampedArray(512 * 256 * 4),
      width: 512,
      height: 256,
    };
    const { calls, fetchFn } = fakeFetch({ data: [{ b64_json: btoa('fakepngbytes') }] });
    const provider = new OpenAICompatibleProvider(
      {
        baseUrl: 'https://images.example/v1',
        model: 'vendor-image-v1',
        supportsImages: true,
      },
      { fetchFn, decodeImage: async () => pixels },
    );
    await provider.generateImage({ prompt: 'a cat', width: 512, height: 256 });
    const body = JSON.parse(String(calls[0].init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: 'vendor-image-v1',
      size: '512x256',
      response_format: 'b64_json',
    });
  });

  it('enables edits only when an edits model is explicitly configured', async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    });
    expect(provider.capabilities.editImage).toBe(false);
    await expect(
      provider.editImage({
        prompt: 'add a boat',
        image: { data: new Uint8ClampedArray(4), width: 1, height: 1 },
      }),
    ).rejects.toThrow(/edits model/i);
  });

  it('posts a GPT Image multipart edit with the transparent region mask', async () => {
    const source = {
      data: new Uint8ClampedArray(3 * 2 * 4).fill(12),
      width: 3,
      height: 2,
    };
    const returned = {
      data: new Uint8ClampedArray(3 * 2 * 4).fill(24),
      width: 3,
      height: 2,
    };
    const encoded: (typeof source)[] = [];
    const encodeImage = vi.fn(async (pixels: typeof source) => {
      encoded.push(pixels);
      return new Blob([new Uint8Array([pixels.width, pixels.height])], { type: 'image/png' });
    });
    const decodeImage = vi.fn(async () => returned);
    const { calls, fetchFn } = fakeFetch({ data: [{ b64_json: btoa('edited-png') }] });
    const provider = new OpenAICompatibleProvider(
      {
        baseUrl: 'https://api.openai.com/v1/',
        model: 'gpt-4o-mini',
        editsModel: 'gpt-image-2',
        apiKey: 'sk-test',
      },
      { fetchFn, encodeImage, decodeImage },
    );

    const result = await provider.editImage({
      image: source,
      prompt: 'put a little boat here',
      mask: { x: 1, y: 0, width: 1, height: 2 },
    });

    expect(provider.capabilities.editImage).toBe(true);
    expect(calls[0].url).toBe('https://api.openai.com/v1/images/edits');
    expect(calls[0].init.headers).toEqual({ Authorization: 'Bearer sk-test' });
    const form = calls[0].init.body as FormData;
    expect(form.get('model')).toBe('gpt-image-2');
    expect(form.get('prompt')).toBe('put a little boat here');
    expect(form.get('image[]')).toBeInstanceOf(Blob);
    expect(form.get('mask')).toBeInstanceOf(Blob);
    expect(form.get('size')).toBe('auto');
    expect(form.get('response_format')).toBeNull();
    expect(encoded).toHaveLength(2);
    const mask = encoded[1];
    expect(mask.data[(0 * mask.width + 0) * 4 + 3]).toBe(255);
    expect(mask.data[(0 * mask.width + 1) * 4 + 3]).toBe(0);
    expect(mask.data[(1 * mask.width + 1) * 4 + 3]).toBe(0);
    expect(result).toEqual({
      pixels: returned,
      prompt: 'put a little boat here',
      providerId: 'openai-compatible',
    });
  });

  it('uses the singular field for compatible legacy routes and normalizes the result', async () => {
    const source = {
      data: new Uint8ClampedArray(300 * 200 * 4),
      width: 300,
      height: 200,
    };
    const decoded = {
      data: new Uint8ClampedArray([9, 8, 7, 255]),
      width: 1,
      height: 1,
    };
    const { calls, fetchFn } = fakeFetch({ data: [{ b64_json: btoa('edited-png') }] });
    const provider = new OpenAICompatibleProvider(
      {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        editsModel: 'vendor-edit-v1',
      },
      {
        fetchFn,
        encodeImage: async () => new Blob(['png'], { type: 'image/png' }),
        decodeImage: async () => decoded,
      },
    );

    const result = await provider.editImage({ image: source, prompt: 'remove the sign' });
    const form = calls[0].init.body as FormData;
    expect(form.get('image')).toBeInstanceOf(Blob);
    expect(form.get('image[]')).toBeNull();
    expect(form.get('size')).toBe('512x512');
    expect(form.get('response_format')).toBe('b64_json');
    expect(result.pixels).toMatchObject({ width: 300, height: 200 });
    expect(result.pixels.data.slice(0, 4)).toEqual(decoded.data);
  });
});
