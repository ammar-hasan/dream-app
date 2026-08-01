/** Provider registry: registration, active selection, settings + key persistence. */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  configureOpenAIProvider,
  getActiveProvider,
  getApiKey,
  getProvider,
  getProviderSettings,
  initAIFromStorage,
  isBYOKActive,
  listProviders,
  registerProvider,
  setActiveProvider,
  unregisterProvider,
} from './registry';
import { MockAIProvider } from './mock';

const CONFIG_KEY = 'dream:ai-config';
const KEY_KEY = 'dream:ai-key:openai-compatible';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  unregisterProvider('openai-compatible');
  setActiveProvider('mock');
  initAIFromStorage();
});

describe('registry basics', () => {
  it('always has the built-in mock as the default provider', () => {
    expect(getActiveProvider().id).toBe('mock');
    expect(listProviders().map((p) => p.id)).toContain('mock');
    expect(isBYOKActive()).toBe(false);
  });

  it('register/unregister round-trips custom providers', () => {
    const extra = new MockAIProvider();
    Object.defineProperty(extra, 'id', { value: 'extra' });
    registerProvider(extra);
    expect(getProvider('extra')).toBe(extra);
    unregisterProvider('extra');
    expect(getProvider('extra')).toBeUndefined();
  });

  it('falls back to the mock when the active provider is unregistered', () => {
    configureOpenAIProvider({ baseUrl: 'http://x/v1', model: 'm' }, 'k');
    setActiveProvider('openai-compatible');
    expect(isBYOKActive()).toBe(true);
    unregisterProvider('openai-compatible');
    expect(getActiveProvider().id).toBe('mock');
  });
});

describe('settings persistence', () => {
  it('persists provider settings and the active id in localStorage', () => {
    configureOpenAIProvider(
      { baseUrl: 'https://openrouter.ai/api/v1', model: 'some/model', supportsImages: true },
      'sk-abc',
    );
    setActiveProvider('openai-compatible');

    const config = JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}') as {
      activeId: string;
      providers: Record<string, { baseUrl?: string; model?: string; supportsImages?: boolean }>;
    };
    expect(config.activeId).toBe('openai-compatible');
    expect(config.providers['openai-compatible'].baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(config.providers['openai-compatible'].model).toBe('some/model');
    expect(config.providers['openai-compatible'].supportsImages).toBe(true);
  });

  it('rebuilds the BYOK provider from storage (simulated reload)', () => {
    configureOpenAIProvider({ baseUrl: 'http://localhost:11434/v1', model: 'llama3' }, 'sk-abc');
    setActiveProvider('openai-compatible');

    // A reload re-runs init against the same storage: provider and active id return.
    initAIFromStorage();
    expect(getActiveProvider().id).toBe('openai-compatible');
    expect(getActiveProvider().name).toMatch(/openai/i);
    expect(getProviderSettings('openai-compatible').model).toBe('llama3');
  });
});

describe('API key handling', () => {
  it('keeps keys in sessionStorage by default, never in the config blob', () => {
    configureOpenAIProvider({ baseUrl: 'http://x/v1', model: 'm' }, 'sk-session-only');
    expect(sessionStorage.getItem(KEY_KEY)).toBe('sk-session-only');
    expect(localStorage.getItem(KEY_KEY)).toBeNull();
    expect(localStorage.getItem(CONFIG_KEY)).not.toContain('sk-session-only');
    expect(getApiKey('openai-compatible')).toBe('sk-session-only');
  });

  it('moves the key to localStorage only with remember-key opt-in', () => {
    configureOpenAIProvider(
      { baseUrl: 'http://x/v1', model: 'm', rememberKey: true },
      'sk-remembered',
    );
    expect(localStorage.getItem(KEY_KEY)).toBe('sk-remembered');
    expect(sessionStorage.getItem(KEY_KEY)).toBeNull();
  });

  it('clears a stored key when an empty key is saved', () => {
    configureOpenAIProvider({ baseUrl: 'http://x/v1', model: 'm', rememberKey: true }, 'sk-gone');
    configureOpenAIProvider({ baseUrl: 'http://x/v1', model: 'm' }, '');
    expect(getApiKey('openai-compatible')).toBe('');
  });
});
