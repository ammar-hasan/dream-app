/** UI preferences store: kid-mode defaults, toggles and persistence. */

import { beforeEach, describe, expect, it } from 'vitest';
import { useUiPrefs } from './uiPrefs';

beforeEach(() => {
  localStorage.clear();
  useUiPrefs.setState({
    kidMode: false,
    speakToolNames: false,
    voiceFeedback: false,
    locale: 'en',
  });
});

describe('uiPrefs store', () => {
  it('enabling kid mode turns both voices on; disabling turns them off', () => {
    useUiPrefs.getState().setKidMode(true);
    expect(useUiPrefs.getState().kidMode).toBe(true);
    expect(useUiPrefs.getState().speakToolNames).toBe(true);
    expect(useUiPrefs.getState().voiceFeedback).toBe(true);

    useUiPrefs.getState().setKidMode(false);
    expect(useUiPrefs.getState().kidMode).toBe(false);
    expect(useUiPrefs.getState().speakToolNames).toBe(false);
    expect(useUiPrefs.getState().voiceFeedback).toBe(false);
  });

  it('voices can be toggled independently of kid mode', () => {
    useUiPrefs.getState().setSpeakToolNames(true);
    expect(useUiPrefs.getState().kidMode).toBe(false);
    expect(useUiPrefs.getState().speakToolNames).toBe(true);

    useUiPrefs.getState().setVoiceFeedback(true);
    expect(useUiPrefs.getState().voiceFeedback).toBe(true);
  });

  it('persists flags to localStorage', () => {
    useUiPrefs.getState().setKidMode(true);
    expect(localStorage.getItem('dream:kid-mode')).toBe('1');
    expect(localStorage.getItem('dream:speak-tool-names')).toBe('1');
    expect(localStorage.getItem('dream:voice-feedback')).toBe('1');

    useUiPrefs.getState().setSpeakToolNames(false);
    expect(localStorage.getItem('dream:speak-tool-names')).toBe('0');
  });

  it('persists the locale choice', () => {
    useUiPrefs.getState().setLocale('ar');
    expect(localStorage.getItem('dream:locale')).toBe('ar');
  });
});
