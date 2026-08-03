/**
 * Narration controls for the timeline bar: one tap to record your voice over
 * the playing animation, one tap to stop and keep the take. Re-recording
 * replaces the old take after a gentle inline confirm (skipped in kid mode —
 * no reading required). The mic is asked for on the first record only, the
 * pulsing dot + elapsed time make recording unmistakable, and everything
 * stays on the device. Hidden entirely where recording is unsupported.
 */

import { useEffect, useState } from 'react';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import {
  beginNarrationTake,
  finishNarrationTake,
  isNarrationSupported,
  narrationDataUrlBytes,
  sharedNarrationRecorder,
  NARRATION_WARN_BYTES,
} from './narration';
import { MicIcon, MuteIcon, SoundIcon, TrashIcon } from './icons';
import { useT } from './i18n';

/** Elapsed time as m:ss — numbers only, no localized text. */
export function formatTakeTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function NarrationControls() {
  const t = useT();
  const narration = useDreamStore((s) => s.doc.narration);
  const narrationMuted = useDreamStore((s) => s.narrationMuted);
  const kidMode = useUiPrefs((s) => s.kidMode);
  const [recording, setRecording] = useState(() => sharedNarrationRecorder().state === 'recording');
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Track the shared recorder (voice commands can start/stop it too).
  useEffect(
    () =>
      sharedNarrationRecorder().onChange(() =>
        setRecording(sharedNarrationRecorder().state === 'recording'),
      ),
    [],
  );

  // Elapsed time + mic level while recording (the recording indicator).
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const recorder = sharedNarrationRecorder();
      setElapsed(recorder.elapsedMs());
      setLevel(recorder.level());
    }, 100);
    return () => clearInterval(timer);
  }, [recording]);

  if (!isNarrationSupported()) return null;

  const store = () => useDreamStore.getState();

  const start = async () => {
    setNote(null);
    const errorKey = await beginNarrationTake(sharedNarrationRecorder(), store());
    if (errorKey) setNote(t(errorKey));
  };

  const stop = async () => {
    await finishNarrationTake(sharedNarrationRecorder(), store());
    const saved = useDreamStore.getState().doc.narration;
    if (saved && narrationDataUrlBytes(saved.audio) > NARRATION_WARN_BYTES) {
      setNote(t('narration.tooBig'));
    }
  };

  const onMic = () => {
    if (recording) {
      void stop();
      return;
    }
    // Re-recording replaces the take: grown-ups get a gentle confirm first;
    // kid mode never asks (no reading required).
    if (narration && !kidMode) {
      setConfirming(true);
      return;
    }
    void start();
  };

  if (confirming && !recording) {
    return (
      <div className="timeline-narration narration-confirm" role="group">
        <span className="narration-confirm-text">{t('narration.reRecord')}</span>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            setConfirming(false);
            void start();
          }}
        >
          {t('narration.reRecordYes')}
        </button>
        <button type="button" className="btn" onClick={() => setConfirming(false)}>
          {t('narration.reRecordNo')}
        </button>
      </div>
    );
  }

  return (
    <div className="timeline-narration" role="group" aria-label={t('narration.record')}>
      <button
        type="button"
        className={`btn narration-mic${recording ? ' recording' : ''}${kidMode ? ' kid' : ''}`}
        aria-pressed={recording}
        aria-label={
          recording
            ? t(kidMode ? 'narration.kidStop' : 'narration.stop')
            : t(kidMode ? 'narration.kidRecord' : 'narration.record')
        }
        title={recording ? t('narration.stop') : t('narration.recordTitle')}
        onClick={onMic}
      >
        <MicIcon />
        {kidMode && (
          <span className="narration-mic-label">
            {recording ? t('narration.kidStop') : t('narration.kidRecord')}
          </span>
        )}
      </button>

      {recording && (
        <span className="narration-indicator" role="status">
          <span className="narration-dot" aria-hidden={true} />
          {t('narration.recording', { time: formatTakeTime(elapsed) })}
          <span className="narration-level" aria-hidden={true}>
            <span style={{ transform: `scaleX(${level})` }} />
          </span>
        </span>
      )}

      {!recording && narration && (
        <>
          <button
            type="button"
            className="btn icon-btn"
            aria-label={narrationMuted ? t('narration.unmute') : t('narration.mute')}
            title={narrationMuted ? t('narration.unmute') : t('narration.mute')}
            aria-pressed={narrationMuted}
            onClick={() => store().setNarrationMuted(!narrationMuted)}
          >
            {narrationMuted ? <MuteIcon /> : <SoundIcon />}
          </button>
          <button
            type="button"
            className="btn icon-btn"
            aria-label={t('narration.delete')}
            title={t('narration.delete')}
            onClick={() => store().setNarration(null)}
          >
            <TrashIcon />
          </button>
        </>
      )}

      {note && (
        <span className="narration-note" role="status">
          {note}
        </span>
      )}
    </div>
  );
}
