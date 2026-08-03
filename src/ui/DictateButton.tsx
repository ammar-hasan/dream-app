/** Shared, feature-detected speech-to-text button for short prompt fields. */

import { useState } from 'react';
import { isSpeechSupported, startDictation, type DictationHandle } from '../ai/speech';
import { useUiPrefs } from '../store/uiPrefs';
import { useT } from './i18n';
import { MicIcon } from './icons';

export function DictateButton({
  onText,
  disabled = false,
  big = false,
}: {
  onText: (text: string) => void;
  disabled?: boolean;
  /** Kid mode: a giant, impossible-to-miss mic. */
  big?: boolean;
}) {
  const t = useT();
  const locale = useUiPrefs((state) => state.locale);
  const [listening, setListening] = useState(false);
  const [handle, setHandle] = useState<DictationHandle | null>(null);
  if (!isSpeechSupported()) return null;

  const toggle = () => {
    if (handle) {
      handle.stop();
      setHandle(null);
      setListening(false);
      return;
    }
    const next = startDictation(
      {
        onText,
        onEnd: () => {
          setHandle(null);
          setListening(false);
        },
      },
      { lang: locale === 'ar' ? 'ar-SA' : 'en-US' },
    );
    if (next) {
      setHandle(next);
      setListening(true);
    }
  };

  const label = listening ? t('ai.micStop') : t('ai.mic');
  return (
    <button
      type="button"
      className={`btn icon-btn${big ? ' kid-mic' : ''}${listening ? ' primary' : ''}`}
      aria-pressed={listening}
      aria-label={label}
      data-tooltip={listening ? t('ai.micStop') : t('ai.micTitle')}
      disabled={disabled}
      onClick={toggle}
    >
      <MicIcon />
    </button>
  );
}
