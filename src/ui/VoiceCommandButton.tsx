/**
 * The toolbar voice-command button: click, say "undo", "red", "new frame"…
 * and Dream does it. The transcript goes through the pure parser
 * (`ai/voiceCommands`) and the executor (`voiceExecutor`); feedback is shown
 * next to the button and spoken aloud when voice feedback is on. Hidden
 * entirely where SpeechRecognition is unsupported.
 */

import { useRef, useState } from 'react';
import { isSpeechSupported, startDictation, type DictationHandle } from '../ai/speech';
import { parseVoiceCommand } from '../ai/voiceCommands';
import { say } from '../ai/say';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { t, useT } from './i18n';
import {
  cancelClear,
  confirmClear,
  executeVoiceCommand,
  type VoiceExecutorStore,
} from './voiceExecutor';
import { saveNow } from './saveNow';
import { exportAppHtml } from './exportApp';
import { exportRealCodeHtml } from './exportRealCode';
import { beginNarrationTake, finishNarrationTake, sharedNarrationRecorder } from './narration';
import { MicIcon } from './icons';

/** Snapshot of the dream store shaped for the voice executor. */
function executorStore(announceDone?: (message: string) => void): VoiceExecutorStore {
  const s = useDreamStore.getState();
  const layer = s.doc.layers.find((l) => l.id === s.activeLayerId);
  return {
    doc: s.doc,
    canUndo: s.canUndo,
    canRedo: s.canRedo,
    settings: s.settings,
    activeLayerHasContent: !!layer && layer.operations.length > 0,
    undo: s.undo,
    redo: s.redo,
    clearLayer: s.clearLayer,
    toggleAnimation: s.toggleAnimation,
    addFrame: s.addFrame,
    openStoryboard: s.openStoryboard,
    play: s.play,
    pause: s.pause,
    setMode: s.setMode,
    startGame: s.startGame,
    stopGame: s.stopGame,
    setGameTemplate: s.setGameTemplate,
    previewApp: s.previewApp,
    exportApp: () => exportAppHtml(s.doc),
    // Async: the executor says "Dreaming in code…" right away; the result
    // (or the friendly error) is announced when the generation finishes.
    exportCode: () => {
      void exportRealCodeHtml(s.doc).then(
        () => announceDone?.(t('voice.exportCodeDone')),
        (error) => announceDone?.(error instanceof Error ? error.message : t('export.failed')),
      );
    },
    setTool: s.setTool,
    setColor: s.setColor,
    setSize: s.setSize,
    setSymmetry: s.setSymmetry,
    narrationRecording: sharedNarrationRecorder().state === 'recording',
    // Async: the mic permission prompt resolves later; a denial is announced
    // when it happens, like the code export above.
    startNarration: () => {
      void beginNarrationTake(sharedNarrationRecorder(), s).then((errorKey) => {
        if (errorKey) announceDone?.(t(errorKey));
      });
    },
    stopNarration: () => void finishNarrationTake(sharedNarrationRecorder(), s),
    deleteNarration: () => s.setNarration(null),
  };
}

export function VoiceCommandButton() {
  const t = useT();
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const handleRef = useRef<DictationHandle | null>(null);
  const transcriptRef = useRef('');
  const pendingClearRef = useRef(false);

  if (!isSpeechSupported()) return null;

  /** Show the feedback and say it aloud when the voice preference is on. */
  const announce = (text: string) => {
    setMessage(text);
    const { voiceFeedback, locale } = useUiPrefs.getState();
    if (voiceFeedback) say(text, { lang: locale });
  };

  const runTranscript = (text: string) => {
    const command = parseVoiceCommand(text, useUiPrefs.getState().locale);

    // A pending "clear this layer?" confirmation intercepts yes/no first.
    if (pendingClearRef.current) {
      pendingClearRef.current = false;
      if (command?.kind === 'confirm') {
        announce(confirmClear(executorStore()).message);
        return;
      }
      if (command?.kind === 'cancel' || command === null) {
        announce(cancelClear().message);
        return;
      }
      // Anything else cancels the pending clear and runs as a new command.
    }

    if (!command) {
      announce(t('voice.unknown'));
      return;
    }
    const result = executeVoiceCommand(command, executorStore(announce), () => void saveNow());
    if (!result) return;
    if (result.awaitConfirm === 'clear') pendingClearRef.current = true;
    announce(result.message);
  };

  const toggle = () => {
    if (handleRef.current) {
      handleRef.current.stop();
      return; // onend runs the transcript
    }
    transcriptRef.current = '';
    const handle = startDictation(
      {
        onText: (text) => {
          transcriptRef.current = text;
        },
        onError: (friendly) => announce(friendly),
        onEnd: () => {
          handleRef.current = null;
          setListening(false);
          const text = transcriptRef.current.trim();
          transcriptRef.current = '';
          if (text) runTranscript(text);
        },
      },
      { lang: useUiPrefs.getState().locale },
    );
    if (handle) {
      handleRef.current = handle;
      setListening(true);
      setMessage(null);
    }
  };

  return (
    <div className="voice-commands">
      <button
        type="button"
        className={`btn icon-btn${listening ? ' primary listening' : ''}`}
        aria-pressed={listening}
        aria-label={listening ? t('toolbar.stopListening') : t('toolbar.voiceCommands')}
        data-tooltip={listening ? undefined : t('toolbar.voiceCommandsTitle')}
        onClick={toggle}
      >
        <MicIcon />
      </button>
      {message && (
        <span className="voice-message" role="status">
          {message}
        </span>
      )}
    </div>
  );
}
