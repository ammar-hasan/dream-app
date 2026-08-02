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
    theme: 'light',
    comfortMode: false,
    recentColors: [],
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

  it('defaults to a light theme when nothing is stored and the OS has no preference', () => {
    expect(useUiPrefs.getState().theme).toBe('light');
  });

  it('persists the theme choice', () => {
    useUiPrefs.getState().setTheme('dark');
    expect(useUiPrefs.getState().theme).toBe('dark');
    expect(localStorage.getItem('dream:theme')).toBe('dark');
  });

  it('persists the comfort-mode toggle independently of everything else', () => {
    useUiPrefs.getState().setComfortMode(true);
    expect(useUiPrefs.getState().comfortMode).toBe(true);
    expect(localStorage.getItem('dream:comfort-mode')).toBe('1');
    // Comfort never flips the other preferences.
    expect(useUiPrefs.getState().kidMode).toBe(false);
    expect(useUiPrefs.getState().theme).toBe('light');

    useUiPrefs.getState().setComfortMode(false);
    expect(localStorage.getItem('dream:comfort-mode')).toBe('0');
  });

  it('remembers recent colors, newest first, deduped and capped at 8', () => {
    const { rememberColor } = useUiPrefs.getState();
    rememberColor('#111111');
    rememberColor('#222222');
    rememberColor('#111111'); // dedupe: moves back to the front
    expect(useUiPrefs.getState().recentColors).toEqual(['#111111', '#222222']);

    for (let i = 0; i < 10; i++) rememberColor(`#color-${i}`);
    expect(useUiPrefs.getState().recentColors).toHaveLength(8);
    expect(useUiPrefs.getState().recentColors[0]).toBe('#color-9');

    expect(JSON.parse(localStorage.getItem('dream:recent-colors') ?? '[]')).toEqual(
      useUiPrefs.getState().recentColors,
    );
  });
});
