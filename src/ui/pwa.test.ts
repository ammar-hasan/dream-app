import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './pwa';
import type { SwContainerLike, SwRegistrationLike, SwWorkerLike } from './pwa';

function fakeWorker(state: string): SwWorkerLike & { messages: unknown[]; fire(): void } {
  const listeners: (() => void)[] = [];
  return {
    state,
    messages: [],
    postMessage(message: unknown) {
      this.messages.push(message);
    },
    addEventListener(_type: string, listener: () => void) {
      listeners.push(listener);
    },
    /** Simulate the worker reaching the 'installed' state. */
    fire() {
      this.state = 'installed';
      for (const listener of listeners) listener();
    },
  };
}

function fakeContainer(options: {
  controller?: unknown;
  registration?: Partial<SwRegistrationLike>;
  fail?: boolean;
}): SwContainerLike & { registeredUrls: string[]; fireUpdateFound(): void } {
  const updateListeners: (() => void)[] = [];
  const registration: SwRegistrationLike = {
    waiting: null,
    installing: null,
    addEventListener: (_type, listener) => updateListeners.push(listener),
    ...options.registration,
  };
  return {
    controller: options.controller,
    registeredUrls: [],
    register(url: string) {
      this.registeredUrls.push(url);
      return options.fail ? Promise.reject(new Error('nope')) : Promise.resolve(registration);
    },
    fireUpdateFound() {
      for (const listener of updateListeners) listener();
    },
  };
}

describe('registerServiceWorker', () => {
  it('does nothing outside production', () => {
    const sw = fakeContainer({ controller: {} });
    registerServiceWorker(false, { serviceWorker: sw });
    expect(sw.registeredUrls).toHaveLength(0);
  });

  it('does nothing where service workers are unsupported', () => {
    const onUpdate = vi.fn();
    registerServiceWorker(true, { serviceWorker: undefined, onUpdate });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('registers sw.js by default', async () => {
    const sw = fakeContainer({ controller: {} });
    registerServiceWorker(true, { serviceWorker: sw });
    expect(sw.registeredUrls).toEqual(['sw.js']);
  });

  it('does not prompt on first install (no existing controller)', async () => {
    const waiting = fakeWorker('installed');
    const sw = fakeContainer({ controller: null, registration: { waiting } });
    const onUpdate = vi.fn();
    registerServiceWorker(true, { serviceWorker: sw, onUpdate });
    await Promise.resolve();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('prompts when a worker is already waiting and applying posts skipWaiting', async () => {
    const waiting = fakeWorker('installed');
    const sw = fakeContainer({ controller: {}, registration: { waiting } });
    const onUpdate = vi.fn();
    registerServiceWorker(true, { serviceWorker: sw, onUpdate });
    await Promise.resolve();
    expect(onUpdate).toHaveBeenCalledTimes(1);
    onUpdate.mock.calls[0][0](); // user pressed Refresh
    expect(waiting.messages).toEqual([{ type: 'DREAM_SKIP_WAITING' }]);
  });

  it('prompts when an update finishes installing', async () => {
    const installing = fakeWorker('installing');
    const sw = fakeContainer({ controller: {}, registration: { installing } });
    const onUpdate = vi.fn();
    registerServiceWorker(true, { serviceWorker: sw, onUpdate });
    await Promise.resolve();
    expect(onUpdate).not.toHaveBeenCalled(); // still installing

    sw.fireUpdateFound();
    installing.fire(); // statechange → installed
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('swallows registration failures', async () => {
    const sw = fakeContainer({ fail: true });
    registerServiceWorker(true, { serviceWorker: sw });
    await Promise.resolve();
    await Promise.resolve();
    // no throw, no unhandled rejection
  });
});
