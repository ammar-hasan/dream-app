/** i18n string table: interpolation, fallbacks, locale switching, RTL. */

import { afterEach, describe, expect, it } from 'vitest';
import { useUiPrefs } from '../../store/uiPrefs';
import { DEFAULT_LOCALE, isLocale, isRtl, LOCALES, speechLanguage, t, translate } from './index';
import { en } from './en';
import { ar } from './ar';
import { fa } from './fa';
import { zh } from './zh';
import { pt } from './pt';

afterEach(() => {
  useUiPrefs.getState().setLocale('en');
});

describe('dictionaries', () => {
  it('every locale covers exactly the English keys', () => {
    for (const dictionary of [ar, fa, zh, pt]) {
      expect(Object.keys(dictionary).sort()).toEqual(Object.keys(en).sort());
    }
  });

  it('has no empty translations', () => {
    for (const dict of [en, ar, fa, zh, pt]) {
      for (const value of Object.values(dict)) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('preserves every interpolation placeholder in every locale', () => {
    for (const dictionary of [ar, fa, zh, pt]) {
      for (const [key, source] of Object.entries(en)) {
        const sourceVars = [...source.matchAll(/\{[^}]+\}/g)].map((match) => match[0]).sort();
        const translatedVars = [...dictionary[key].matchAll(/\{[^}]+\}/g)]
          .map((match) => match[0])
          .sort();
        expect(translatedVars, key).toEqual(sourceVars);
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
    expect(isLocale('fa')).toBe(true);
    expect(isLocale('zh')).toBe(true);
    expect(isLocale('pt')).toBe(true);
    expect(isLocale('fr')).toBe(false);
  });

  it('flags Arabic and Persian as RTL and English as LTR', () => {
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('fa')).toBe(true);
    expect(isRtl('en')).toBe(false);
    expect(isRtl('zh')).toBe(false);
    expect(isRtl('pt')).toBe(false);
    expect(LOCALES.find((l) => l.id === 'ar')?.dir).toBe('rtl');
    expect(LOCALES.find((l) => l.id === 'fa')?.dir).toBe('rtl');
    expect(LOCALES.find((l) => l.id === DEFAULT_LOCALE)?.dir).toBe('ltr');
  });

  it('uses regional browser speech languages', () => {
    expect(speechLanguage('en')).toBe('en-US');
    expect(speechLanguage('ar')).toBe('ar-SA');
    expect(speechLanguage('fa')).toBe('fa-IR');
    expect(speechLanguage('zh')).toBe('zh-CN');
    expect(speechLanguage('pt')).toBe('pt-BR');
  });
});

describe('t()', () => {
  it('follows the locale in the UI-preferences store', () => {
    expect(t('toolbar.save')).toBe('Save');
    useUiPrefs.getState().setLocale('ar');
    expect(t('toolbar.save')).toBe('حفظ');
    expect(t('voice.tool', { tool: t('tools.brush') })).toBe('فرشاة!');
    useUiPrefs.getState().setLocale('fa');
    expect(t('toolbar.save')).toBe('ذخیره');
    useUiPrefs.getState().setLocale('zh');
    expect(t('toolbar.save')).toBe('保存');
    expect(t('plot.ready', { rows: 4, series: 2 })).toBe('4 行 · 2 条序列已就绪');
    useUiPrefs.getState().setLocale('pt');
    expect(t('toolbar.save')).toBe('Salvar');
    expect(t('export.codeLabel')).toBe('Código real (IA) (.html)');
  });
});
