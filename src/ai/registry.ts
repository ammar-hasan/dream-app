/**
 * AI provider registry. Providers self-register; the UI (later slices) asks
 * the registry for the active provider. The mock is always available.
 */

import { MockAIProvider } from './mock';
import type { AIProvider } from './types';

const providers = new Map<string, AIProvider>();
let defaultProviderId: string | null = null;

export function registerProvider(provider: AIProvider, { makeDefault = false } = {}): void {
  providers.set(provider.id, provider);
  if (makeDefault || defaultProviderId === null) defaultProviderId = provider.id;
}

export function getProvider(id: string): AIProvider | undefined {
  return providers.get(id);
}

export function listProviders(): AIProvider[] {
  return [...providers.values()];
}

export function setDefaultProvider(id: string): void {
  if (!providers.has(id)) throw new Error(`Unknown AI provider: ${id}`);
  defaultProviderId = id;
}

export function getDefaultProvider(): AIProvider {
  const provider = defaultProviderId !== null ? providers.get(defaultProviderId) : undefined;
  if (!provider) throw new Error('No AI provider registered');
  return provider;
}

// The offline mock is registered by default so AI flows always have a backend.
registerProvider(new MockAIProvider(), { makeDefault: true });

export * from './types';
export { MockAIProvider } from './mock';
