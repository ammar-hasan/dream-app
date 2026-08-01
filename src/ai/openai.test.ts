/** OpenAI-compatible provider: request construction, capabilities, errors. */

import { describe, expect, it, vi } from 'vitest';
import { createDocument } from '../engine/document';
import { OpenAICompatibleProvider } from './openai';

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
  it('declares no image generation for chat-only endpoints and refuses politely', async () => {
    const provider = new OpenAICompatibleProvider(
      { baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
      { fetchFn: fakeFetch(chatPayload).fetchFn },
    );
    expect(provider.capabilities).toEqual({ chat: true, generateImage: false, editImage: false });
    await expect(provider.generateImage({ prompt: 'a cat' })).rejects.toThrow(/chat only/i);
  });

  it('posts to /images/generations and decodes the b64 result when supported', async () => {
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
    const body = JSON.parse(String(calls[0].init.body)) as { size: string; prompt: string };
    expect(body.size).toBe('512x256');
    expect(body.prompt).toBe('a cat');
    expect(decodeImage).toHaveBeenCalledOnce();
    expect(result.pixels).toBe(pixels);
  });
});
