/**
 * AI provider registry + settings persistence.
 *
 * Providers self-register; the panel asks the registry for the active one.
 * Non-secret settings (base URL, model, active provider) persist in
 * localStorage. API keys are secrets: sessionStorage by default (gone when
 * the tab closes), localStorage only when the user ticks "remember key".
 * Keys are never logged and never written into the config blob.
 */

import { MockAIProvider } from './mock';
import { OpenAICompatibleProvider } from './openai';
import type { AIProvider } from './types';

const CONFIG_KEY = 'dream:ai-config';
const KEY_PREFIX = 'dream:ai-key:';

export interface AIProviderSettings {
  baseUrl?: string;
  model?: string;
  imageModel?: string;
  supportsImages?: boolean;
  rememberKey?: boolean;
}

interface PersistedConfig {
  activeId: string;
  providers: Record<string, AIProviderSettings>;
}

const providers = new Map<string, AIProvider>();
let activeProviderId: string | null = null;

export function registerProvider(provider: AIProvider, { makeDefault = false } = {}): void {
  providers.set(provider.id, provider);
  if (makeDefault || activeProviderId === null) activeProviderId = provider.id;
}

export function unregisterProvider(id: string): void {
  if (id === 'mock') return; // the built-in provider always stays
  providers.delete(id);
  if (activeProviderId === id) setActiveProvider('mock');
}

export function getProvider(id: string): AIProvider | undefined {
  return providers.get(id);
}

export function listProviders(): AIProvider[] {
  return [...providers.values()];
}

export function setActiveProvider(id: string): void {
  if (!providers.has(id)) throw new Error(`Unknown AI provider: ${id}`);
  activeProviderId = id;
  persistConfig();
}

export function getActiveProvider(): AIProvider {
  const provider = activeProviderId !== null ? providers.get(activeProviderId) : undefined;
  if (!provider) throw new Error('No AI provider registered');
  return provider;
}

export function getActiveProviderId(): string {
  return getActiveProvider().id;
}

/** True when the user drives their own AI stack — no free-tier counter. */
export function isBYOKActive(): boolean {
  return getActiveProviderId() !== 'mock';
}

// --- Secrets ---------------------------------------------------------------

function safeStorage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local'
      ? (globalThis.localStorage ?? null)
      : (globalThis.sessionStorage ?? null);
  } catch {
    return null;
  }
}

export function getApiKey(providerId: string): string {
  return (
    safeStorage('session')?.getItem(KEY_PREFIX + providerId) ??
    safeStorage('local')?.getItem(KEY_PREFIX + providerId) ??
    ''
  );
}

/** Store (or clear) a key; `remember` moves it from session to local storage. */
function setApiKey(providerId: string, key: string, remember: boolean): void {
  const session = safeStorage('session');
  const local = safeStorage('local');
  session?.removeItem(KEY_PREFIX + providerId);
  local?.removeItem(KEY_PREFIX + providerId);
  if (key === '') return;
  (remember ? local : session)?.setItem(KEY_PREFIX + providerId, key);
}

// --- Settings persistence ----------------------------------------------------

function readConfig(): PersistedConfig {
  try {
    const raw = safeStorage('local')?.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw) as PersistedConfig;
  } catch {
    // corrupted config — fall back to defaults
  }
  return { activeId: 'mock', providers: {} };
}

function persistConfig(): void {
  const config: PersistedConfig = {
    activeId: activeProviderId ?? 'mock',
    providers: savedSettings,
  };
  try {
    safeStorage('local')?.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // storage unavailable (private mode) — settings just won't persist
  }
}

/** Latest settings per provider id, written through to the config blob. */
const savedSettings: Record<string, AIProviderSettings> = {};

export function getProviderSettings(id: string): AIProviderSettings {
  return readConfig().providers[id] ?? {};
}

/** Dependencies providers need from the browser (image decode for BYOK). */
export interface AIDeps {
  decodeImage?: (blob: Blob) => Promise<import('../engine/filters').PixelBuffer>;
}

let defaultDeps: AIDeps = {};

/**
 * Give the registry browser dependencies (the panel calls this on mount)
 * and rebuild persisted providers so they can decode images after a reload.
 */
export function setAIDeps(deps: AIDeps): void {
  defaultDeps = deps;
  initAIFromStorage(deps);
}

/**
 * Create/replace the OpenAI-compatible provider from the settings form and
 * (optionally) store its key. The key is applied to the live instance but
 * persisted only per the remember-key choice.
 */
export function configureOpenAIProvider(
  settings: AIProviderSettings,
  apiKey: string,
  deps: AIDeps = defaultDeps,
): OpenAICompatibleProvider {
  const provider = new OpenAICompatibleProvider(
    {
      baseUrl: settings.baseUrl?.trim() || 'https://api.openai.com/v1',
      model: settings.model?.trim() || 'gpt-4o-mini',
      imageModel: settings.imageModel?.trim() || undefined,
      supportsImages: !!settings.supportsImages,
      apiKey: apiKey || undefined,
    },
    deps,
  );
  registerProvider(provider);
  savedSettings[provider.id] = { ...settings };
  setApiKey(provider.id, apiKey, !!settings.rememberKey);
  persistConfig();
  return provider;
}

/** Rebuild providers + active selection from storage (app start, and tests). */
export function initAIFromStorage(deps: AIDeps = defaultDeps): void {
  const config = readConfig();
  const saved = config.providers['openai-compatible'];
  if (saved?.baseUrl || saved?.model) {
    savedSettings['openai-compatible'] = { ...saved };
    registerProvider(
      new OpenAICompatibleProvider(
        {
          baseUrl: saved.baseUrl ?? 'https://api.openai.com/v1',
          model: saved.model ?? 'gpt-4o-mini',
          imageModel: saved.imageModel,
          supportsImages: saved.supportsImages,
          apiKey: getApiKey('openai-compatible') || undefined,
        },
        deps,
      ),
    );
  }
  const wanted = config.activeId;
  activeProviderId = providers.has(wanted) ? wanted : 'mock';
}

// The offline mock is registered by default so AI flows always have a backend.
registerProvider(new MockAIProvider(), { makeDefault: true });
initAIFromStorage();

export * from './types';
export { MockAIProvider } from './mock';
export { OpenAICompatibleProvider } from './openai';
