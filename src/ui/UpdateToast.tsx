/**
 * Offline PWA glue: registers the service worker (production only) and shows
 * a quiet toast when a new version of Dream has downloaded and is waiting —
 * refreshing is always the user's choice (the worker waits for
 * DREAM_SKIP_WAITING, sent from here).
 */

import { useEffect, useState } from 'react';
import { registerServiceWorker } from './pwa';
import { useT } from './i18n';

export function UpdateToast() {
  const t = useT();
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    registerServiceWorker(import.meta.env.PROD, {
      serviceWorker:
        typeof navigator !== 'undefined' ? (navigator.serviceWorker ?? undefined) : undefined,
      onUpdate: (apply) => setApplyUpdate(() => apply),
    });
  }, []);

  if (!applyUpdate) return null;

  const refresh = () => {
    // The new worker takes control right after skipWaiting; reload onto it.
    let reloading = false;
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
    applyUpdate();
  };

  return (
    <div className="update-toast" role="status">
      <span className="update-toast-text">{t('update.ready')}</span>
      <button type="button" className="btn primary" onClick={refresh}>
        {t('update.refresh')}
      </button>
      <button
        type="button"
        className="btn icon-btn small"
        aria-label={t('update.dismiss')}
        onClick={() => setApplyUpdate(null)}
      >
        ✕
      </button>
    </div>
  );
}
