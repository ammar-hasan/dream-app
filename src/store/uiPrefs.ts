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

export interface UiPrefs {
  kidMode: boolean;
  /** Say tool names aloud on hover/focus (default on in kid mode). */
  speakToolNames: boolean;
  /** Say what happened after each voice command (default off for adults). */
  voiceFeedback: boolean;
  /** Active locale id (validated against the i18n dictionaries at lookup). */
  locale: string;

  setKidMode(on: boolean): void;
  setSpeakToolNames(on: boolean): void;
  setVoiceFeedback(on: boolean): void;
  setLocale(locale: string): void;
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
  };
});
