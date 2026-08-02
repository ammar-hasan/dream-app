/**
 * Settings menu (the gear in the toolbar): Little Dreamer mode, the two
 * voice toggles and the language picker — all per-user preferences in one
 * place. Also hosts the "Install Dream" affordance when the browser offers
 * it (beforeinstallprompt); dismissing it is remembered. Closes on outside
 * click or Escape.
 */

import { useEffect, useRef, useState } from 'react';
import { useUiPrefs } from '../store/uiPrefs';
import { LOCALES, useT } from './i18n';
import { GearIcon } from './icons';

const INSTALL_DISMISSED_KEY = 'dream:install-dismissed';

/** Non-standard event Chrome/Edge fire when the app is installable. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

function readInstallDismissed(): boolean {
  try {
    return globalThis.localStorage?.getItem(INSTALL_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function SettingsMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const kidMode = useUiPrefs((s) => s.kidMode);
  const speakToolNames = useUiPrefs((s) => s.speakToolNames);
  const voiceFeedback = useUiPrefs((s) => s.voiceFeedback);
  const theme = useUiPrefs((s) => s.theme);
  const locale = useUiPrefs((s) => s.locale);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(readInstallDismissed);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Keep the browser's mini-infobar quiet; the menu offers install instead.
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const dismissInstall = () => {
    setInstallDismissed(true);
    try {
      globalThis.localStorage?.setItem(INSTALL_DISMISSED_KEY, '1');
    } catch {
      // storage unavailable — the offer simply reappears next session
    }
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="settings-menu" ref={ref}>
      <button
        type="button"
        className={`btn icon-btn${open ? ' primary' : ''}`}
        aria-label={t('toolbar.settings')}
        aria-expanded={open}
        aria-haspopup="menu"
        data-tooltip={kidMode ? undefined : t('toolbar.settings')}
        onClick={() => setOpen(!open)}
      >
        <GearIcon />
      </button>

      {open && (
        <div className="settings-popover" role="menu" aria-label={t('settings.title')}>
          <label className="settings-item checkbox-field">
            <input
              type="checkbox"
              checked={kidMode}
              onChange={(e) => useUiPrefs.getState().setKidMode(e.target.checked)}
            />
            <span className="settings-item-text">
              <strong>{t('settings.kidMode')}</strong>
              <small>{t('settings.kidModeHint')}</small>
            </span>
          </label>

          <label className="settings-item checkbox-field">
            <input
              type="checkbox"
              checked={speakToolNames}
              onChange={(e) => useUiPrefs.getState().setSpeakToolNames(e.target.checked)}
            />
            <span className="settings-item-text">
              <strong>{t('settings.speakTools')}</strong>
              <small>{t('settings.speakToolsHint')}</small>
            </span>
          </label>

          <label className="settings-item checkbox-field">
            <input
              type="checkbox"
              checked={voiceFeedback}
              onChange={(e) => useUiPrefs.getState().setVoiceFeedback(e.target.checked)}
            />
            <span className="settings-item-text">
              <strong>{t('settings.voiceFeedback')}</strong>
              <small>{t('settings.voiceFeedbackHint')}</small>
            </span>
          </label>

          <label className="settings-item checkbox-field">
            <input
              type="checkbox"
              checked={theme === 'dark'}
              onChange={(e) => useUiPrefs.getState().setTheme(e.target.checked ? 'dark' : 'light')}
            />
            <span className="settings-item-text">
              <strong>{t('settings.theme')}</strong>
              <small>{t('settings.themeHint')}</small>
            </span>
          </label>

          <label className="settings-item settings-language">
            <span className="settings-item-text">
              <strong>{t('settings.language')}</strong>
            </span>
            <select
              className="font-select"
              value={locale}
              onChange={(e) => useUiPrefs.getState().setLocale(e.target.value)}
            >
              {LOCALES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          {installPrompt && !installDismissed && (
            <div className="settings-item settings-install">
              <span className="settings-item-text">
                <strong>{t('settings.install')}</strong>
                <small>{t('settings.installHint')}</small>
              </span>
              <button
                type="button"
                className="btn small-apply"
                onClick={() => {
                  void installPrompt.prompt();
                  setInstallPrompt(null);
                }}
              >
                {t('settings.installAction')}
              </button>
              <button
                type="button"
                className="btn icon-btn small"
                aria-label={t('settings.installDismiss')}
                onClick={dismissInstall}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
