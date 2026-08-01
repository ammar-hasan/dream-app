/**
 * Per-USER interface preferences (Zustand), persisted in localStorage —
 * unlike the document store, these follow the person, not the project:
 * Little Dreamer (kid) mode, spoken tool names, spoken voice-command
 * feedback, and the UI language.
 *
 * Turning kid mode on also turns both voices on (instant delight, zero
 * setup); turning it off turns them back off. Either voice can then be
 * toggled independently in the settings menu.
 */

import { create } from 'zustand';

const KID_KEY = 'dream:kid-mode';
const SPEAK_TOOLS_KEY = 'dream:speak-tool-names';
const VOICE_FEEDBACK_KEY = 'dream:voice-feedback';
const LOCALE_KEY = 'dream:locale';
const THEME_KEY = 'dream:theme';
const RECENT_COLORS_KEY = 'dream:recent-colors';
const MAX_RECENT_COLORS = 8;

export type Theme = 'light' | 'dark';

export interface UiPrefs {
  kidMode: boolean;
  /** Say tool names aloud on hover/focus (default on in kid mode). */
  speakToolNames: boolean;
  /** Say what happened after each voice command (default off for adults). */
  voiceFeedback: boolean;
  /** Active locale id (validated against the i18n dictionaries at lookup). */
  locale: string;
  /** Color theme — defaults to the OS preference until the user picks one. */
  theme: Theme;
  /** Most-recently-used colors, newest first (for the options panel row). */
  recentColors: string[];

  setKidMode(on: boolean): void;
  setSpeakToolNames(on: boolean): void;
  setVoiceFeedback(on: boolean): void;
  setLocale(locale: string): void;
  setTheme(theme: Theme): void;
  rememberColor(color: string): void;
}

function readFlag(key: string): boolean {
  try {
    return globalThis.localStorage?.getItem(key) === '1';
  } catch {
    return false;
  }
}

function readLocale(): string {
  try {
    return globalThis.localStorage?.getItem(LOCALE_KEY) ?? 'en';
  } catch {
    return 'en';
  }
}

function readTheme(): Theme {
  try {
    const saved = globalThis.localStorage?.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    // No choice yet: follow the OS.
    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function readRecentColors(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(RECENT_COLORS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((c): c is string => typeof c === 'string').slice(0, MAX_RECENT_COLORS)
      : [];
  } catch {
    return [];
  }
}

function write(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // storage unavailable (private mode etc.) — prefs simply don't persist
  }
}

export const useUiPrefs = create<UiPrefs>()((set) => {
  const kidMode = readFlag(KID_KEY);
  return {
    kidMode,
    // Kid mode defaults both voices on; adults default to silence.
    speakToolNames: readFlag(SPEAK_TOOLS_KEY) || kidMode,
    voiceFeedback: readFlag(VOICE_FEEDBACK_KEY) || kidMode,
    locale: readLocale(),
    theme: readTheme(),
    recentColors: readRecentColors(),

    setKidMode: (on) => {
      set({ kidMode: on, speakToolNames: on, voiceFeedback: on });
      write(KID_KEY, on ? '1' : '0');
      write(SPEAK_TOOLS_KEY, on ? '1' : '0');
      write(VOICE_FEEDBACK_KEY, on ? '1' : '0');
    },

    setSpeakToolNames: (on) => {
      set({ speakToolNames: on });
      write(SPEAK_TOOLS_KEY, on ? '1' : '0');
    },

    setVoiceFeedback: (on) => {
      set({ voiceFeedback: on });
      write(VOICE_FEEDBACK_KEY, on ? '1' : '0');
    },

    setLocale: (locale) => {
      set({ locale });
      write(LOCALE_KEY, locale);
    },

    setTheme: (theme) => {
      set({ theme });
      write(THEME_KEY, theme);
    },

    rememberColor: (color) => {
      set((s) => {
        const recentColors = [color, ...s.recentColors.filter((c) => c !== color)].slice(
          0,
          MAX_RECENT_COLORS,
        );
        write(RECENT_COLORS_KEY, JSON.stringify(recentColors));
        return { recentColors };
      });
    },
  };
});
