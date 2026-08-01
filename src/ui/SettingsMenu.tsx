/**
 * Settings menu (the gear in the toolbar): Little Dreamer mode, the two
 * voice toggles and the language picker — all per-user preferences in one
 * place. Closes on outside click or Escape.
 */

import { useEffect, useRef, useState } from 'react';
import { useUiPrefs } from '../store/uiPrefs';
import { LOCALES, useT } from './i18n';
import { GearIcon } from './icons';

export function SettingsMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const kidMode = useUiPrefs((s) => s.kidMode);
  const speakToolNames = useUiPrefs((s) => s.speakToolNames);
  const voiceFeedback = useUiPrefs((s) => s.voiceFeedback);
  const locale = useUiPrefs((s) => s.locale);

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
        title={t('toolbar.settings')}
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
        </div>
      )}
    </div>
  );
}
