/**
 * Minimal string-table i18n — no library. `t(key, vars)` looks the key up in
 * the active locale's dictionary, falls back to English, then to the key
 * itself, and interpolates `{name}` placeholders. The active locale lives in
 * the UI-preferences store (persisted per user, not per document).
 *
 * Adding a locale: create `xx.ts` next to the existing tables with the same keys,
 * register it in `DICTIONARIES` and `LOCALES` below — done.
 */

import { useUiPrefs } from '../../store/uiPrefs';
import { en } from './en';
import { ar } from './ar';
import { fa } from './fa';
import { zh } from './zh';
import { pt } from './pt';

export type Locale = 'en' | 'ar' | 'fa' | 'zh' | 'pt';

/** Shown in the settings language picker; `dir` drives the root `dir` attr. */
export const LOCALES: { id: Locale; label: string; dir: 'ltr' | 'rtl' }[] = [
  { id: 'en', label: 'English', dir: 'ltr' },
  { id: 'ar', label: 'العربية', dir: 'rtl' },
  { id: 'fa', label: 'فارسی', dir: 'rtl' },
  { id: 'zh', label: '简体中文', dir: 'ltr' },
  { id: 'pt', label: 'Português (Brasil)', dir: 'ltr' },
];

const DICTIONARIES: Record<Locale, Record<string, string>> = { en, ar, fa, zh, pt };

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(id: string): id is Locale {
  return id in DICTIONARIES;
}

export function isRtl(locale: string): boolean {
  return LOCALES.find((l) => l.id === locale)?.dir === 'rtl';
}

/** Browser speech-service language for the active product locale. */
export function speechLanguage(locale: string): string {
  if (locale === 'ar') return 'ar-SA';
  if (locale === 'fa') return 'fa-IR';
  if (locale === 'zh') return 'zh-CN';
  if (locale === 'pt') return 'pt-BR';
  return 'en-US';
}

export type StringVars = Record<string, string | number>;

/** Translate `key` into the given locale with `{var}` interpolation. */
export function translate(locale: string, key: string, vars?: StringVars): string {
  const table = isLocale(locale) ? DICTIONARIES[locale] : DICTIONARIES[DEFAULT_LOCALE];
  let text = table[key] ?? DICTIONARIES[DEFAULT_LOCALE][key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/** Translate using the app's active locale. */
export function t(key: string, vars?: StringVars): string {
  return translate(useUiPrefs.getState().locale, key, vars);
}

/** React hook: re-renders the component when the locale changes. */
export function useT(): (key: string, vars?: StringVars) => string {
  useUiPrefs((s) => s.locale);
  return t;
}
