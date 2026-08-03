/**
 * The "Real code (AI)" export flow: provider routing (BYOK chat vs. the
 * deterministic Dream AI template), friendly failures and the daily
 * free-tier gate — with a fake download so tests stay in Node.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockAIProvider } from '../ai/mock';
import type { AICapabilities, AIProvider } from '../ai/types';
import { consumeFreeTry, FREE_TRIES_PER_DAY, getUsageToday } from '../ai/usage';
import { createDocument, createLayer } from '../engine/document';
import type { DreamDocument, Frame } from '../engine/types';
import { codeFileName, exportRealCodeHtml, generateRealCodeHtml } from './exportRealCode';

const NO_CHAT: AICapabilities = { chat: false, generateImage: false, editImage: false };
const CHAT: AICapabilities = { chat: true, generateImage: false, editImage: false };

function fakeProvider(reply: string, capabilities: AICapabilities = CHAT): AIProvider {
  return {
    id: 'fake-chat',
    name: 'Fake chat AI',
    capabilities,
    chat: vi.fn(async () => reply),
    generateImage: vi.fn(),
    editImage: vi.fn(),
    getFeedback: vi.fn(),
  } as unknown as AIProvider;
}

function doc(): DreamDocument {
  const base = createDocument({ width: 200, height: 100, name: 'My App' });
  const f1: Frame = { id: 'f1', layers: [createLayer('S1')] };
  const f2: Frame = { id: 'f2', layers: [createLayer('S2')] };
  return { ...base, frames: [f1, f2], activeFrameId: 'f1', layers: f1.layers };
}

beforeEach(() => {
  localStorage.clear();
});

describe('codeFileName', () => {
  it('names the file after the document, with a fallback', () => {
    expect(codeFileName('My App')).toBe('My App-code.html');
    expect(codeFileName('   ')).toBe('dream-code.html');
  });
});

describe('generateRealCodeHtml', () => {
  it('uses the deterministic local template with the built-in Dream AI', async () => {
    const { html, local } = await generateRealCodeHtml(doc(), { provider: new MockAIProvider() });
    expect(local).toBe(true);
    expect(html).toContain('<section class="screen" id="screen-1"');
    expect(html).toContain('generated locally by Dream AI');
  });

  it('asks a chat-capable provider and extracts the HTML from its reply', async () => {
    const reply =
      'Here is your app!\n```html\n<!doctype html>\n<html><body>app</body></html>\n```\nEnjoy!';
    const provider = fakeProvider(reply);
    const { html, local } = await generateRealCodeHtml(doc(), { provider });
    expect(local).toBe(false);
    expect(html).toBe('<!doctype html>\n<html><body>app</body></html>');
    // The call carries our system prompt + the structured app description.
    const messages = (provider.chat as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      role: string;
      text: string;
    }[];
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].text).toContain('"name":"My App"');
  });

  it('rejects a reply that is not code, kindly', async () => {
    const provider = fakeProvider('Sorry, I cannot do that.');
    await expect(generateRealCodeHtml(doc(), { provider })).rejects.toThrow(
      /did not answer with code/i,
    );
  });

  it('rejects code with external references, kindly', async () => {
    const provider = fakeProvider(
      '<html><head><script src="https://cdn.example.com/x.js"></script></head></html>',
    );
    await expect(generateRealCodeHtml(doc(), { provider })).rejects.toThrow(/outside links/i);
  });

  it('rejects providers that cannot chat, kindly', async () => {
    const provider = fakeProvider('', NO_CHAT);
    await expect(generateRealCodeHtml(doc(), { provider })).rejects.toThrow(/cannot write code/i);
  });
});

describe('exportRealCodeHtml', () => {
  it('downloads the file and counts one free try with Dream AI', async () => {
    const download = vi.fn();
    const result = await exportRealCodeHtml(doc(), { provider: new MockAIProvider(), download });
    expect(result).toEqual({ local: true, fileName: 'My App-code.html' });
    expect(download).toHaveBeenCalledOnce();
    const [blob, name] = download.mock.calls[0] as [Blob, string];
    expect(name).toBe('My App-code.html');
    expect(blob.type).toBe('text/html');
    expect(getUsageToday().count).toBe(1);
  });

  it('refuses kindly when the daily free tier is spent', async () => {
    for (let i = 0; i < FREE_TRIES_PER_DAY; i += 1) consumeFreeTry();
    const download = vi.fn();
    await expect(
      exportRealCodeHtml(doc(), { provider: new MockAIProvider(), download }),
    ).rejects.toThrow(/free dreams for today/i);
    expect(download).not.toHaveBeenCalled();
  });
});
