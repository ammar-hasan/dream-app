/**
 * Spoken tool names: returns a handler that says a label aloud when the
 * "speak tool names" preference is on (default in kid mode). Silent where
 * speech synthesis is unsupported — `say` no-ops on its own.
 */

import { useCallback } from 'react';
import { say } from '../ai/say';
import { useUiPrefs } from '../store/uiPrefs';

export function useSpeakName(): (label: string) => void {
  const speakToolNames = useUiPrefs((s) => s.speakToolNames);
  const locale = useUiPrefs((s) => s.locale);
  return useCallback(
    (label: string) => {
      if (speakToolNames) say(label, { lang: locale });
    },
    [speakToolNames, locale],
  );
}
