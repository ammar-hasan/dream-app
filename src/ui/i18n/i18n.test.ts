/** i18n string table: interpolation, fallbacks, locale switching, RTL. */

import { afterEach, describe, expect, it } from 'vitest';
import { useUiPrefs } from '../../store/uiPrefs';
import { DEFAULT_LOCALE, isLocale, isRtl, LOCALES, t, translate } from './index';
import { en } from './en';
import { ar } from './ar';

afterEach(() => {
  useUiPrefs.getState().setLocale('en');
});

describe('dictionaries', () => {
  it('every locale covers exactly the English keys', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it('has no empty translations', () => {
    for (const dict of [en, ar]) {
      for (const value of Object.values(dict)) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('translate', () => {
  it('interpolates {variables}', () => {
    expect(translate('en', 'timeline.frame', { n: 3 })).toBe('Frame 3');
    expect(translate('ar', 'timeline.frame', { n: 3 })).toBe('إطار 3');
  });

  it('falls back to English for keys missing in the active locale', () => {
    expect(translate('ar', 'definitely.not.there')).toBe('definitely.not.there');
  });

  it('falls back to the default locale for unknown locale ids', () => {
    expect(translate('fr', 'toolbar.save')).toBe('Save');
  });

  it('returns the key itself when nothing knows it', () => {
    expect(translate('en', 'no.such.key')).toBe('no.such.key');
  });
});

describe('locale registry', () => {
  it('recognizes registered locales and rejects others', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('ar')).toBe(true);
    expect(isLocale('fr')).toBe(false);
  });

  it('flags Arabic as RTL and English as LTR', () => {
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('en')).toBe(false);
    expect(LOCALES.find((l) => l.id === 'ar')?.dir).toBe('rtl');
    expect(LOCALES.find((l) => l.id === DEFAULT_LOCALE)?.dir).toBe('ltr');
  });
});

describe('t()', () => {
  it('follows the locale in the UI-preferences store', () => {
    expect(t('toolbar.save')).toBe('Save');
    useUiPrefs.getState().setLocale('ar');
    expect(t('toolbar.save')).toBe('حفظ');
    expect(t('voice.tool', { tool: t('tools.brush') })).toBe('فرشاة!');
  });
});
