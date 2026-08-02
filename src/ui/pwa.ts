/**
 * Service-worker registration and the update flow.
 *
 * Runs in production only (the caller passes `import.meta.env.PROD`); every
 * browser API is injectable so the logic is testable in Node. The worker
 * itself never activates a new version on its own — it waits until the app
 * posts `DREAM_SKIP_WAITING`, which happens only on user action (the update
 * toast's Refresh button).
 */

export interface SwWorkerLike {
  state?: string;
  postMessage(message: unknown): void;
  addEventListener(type: string, listener: () => void): void;
}

export interface SwRegistrationLike {
  waiting: SwWorkerLike | null;
  installing: SwWorkerLike | null;
  addEventListener(type: string, listener: () => void): void;
}

export interface SwContainerLike {
  /** Truthy when a worker already controls this page (i.e. this IS an update). */
  controller?: unknown;
  register(scriptURL: string): Promise<SwRegistrationLike>;
}

export interface RegisterOptions {
  /** The container (navigator.serviceWorker) or undefined where unsupported. */
  serviceWorker?: SwContainerLike;
  /** Called when a new version waits to activate; `apply()` activates it. */
  onUpdate?: (apply: () => void) => void;
  /** Worker script URL, resolved against the document base. Default 'sw.js'. */
  url?: string;
}

export function registerServiceWorker(prod: boolean, options: RegisterOptions): void {
  const sw = options.serviceWorker;
  if (!prod || !sw) return;
  void sw
    .register(options.url ?? 'sw.js')
    .then((registration) => {
      const ready = (worker: SwWorkerLike | null) => {
        // Without an existing controller this is the FIRST install — the new
        // worker is the only version, so there is nothing to update to.
        if (!worker || !sw.controller) return;
        options.onUpdate?.(() => worker.postMessage({ type: 'DREAM_SKIP_WAITING' }));
      };
      ready(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') ready(worker);
        });
      });
    })
    .catch(() => {
      // Registration blocked or offline: the app works fine without a worker.
    });
}
