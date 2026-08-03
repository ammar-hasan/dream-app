/**
 * The toolbar voice-command button: click, say "undo", "red", "new frame"…
 * and Dream does it. The transcript goes through the pure parser
 * (`ai/voiceCommands`) and the executor (`voiceExecutor`); feedback is shown
 * next to the button and spoken aloud when voice feedback is on. Where
 * recognition is unsupported, the button explains the other input paths.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { isSpeechSupported, startDictation, type DictationHandle } from '../ai/speech';
import { parseVoiceCommand } from '../ai/voiceCommands';
import { say } from '../ai/say';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { speechLanguage, t, useT } from './i18n';
import {
  cancelClear,
  confirmClear,
  executeVoiceCommand,
  type VoiceExecutorContext,
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
  const selectedOperations =
    layer?.operations.filter((operation) => s.selection.includes(operation.id)) ?? [];
  return {
    doc: s.doc,
    canUndo: s.canUndo,
    canRedo: s.canRedo,
    settings: s.settings,
    activeLayerHasContent: !!layer && layer.operations.length > 0,
    selectionCount: s.selection.length,
    selectionTransformable: s.selection.length > 0 && !!layer && !layer.locked,
    selectionRecolorable:
      s.selection.length > 0 &&
      !!layer &&
      selectedOperations.length === s.selection.length &&
      selectedOperations.every(
        (operation) =>
          operation.kind === 'shape' ||
          operation.kind === 'text' ||
          (operation.kind === 'stroke' && operation.tool !== 'eraser'),
      ),
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
    scaleSelection: s.scaleSelection,
    nudgeSelection: s.nudgeSelection,
    centerSelection: s.centerSelection,
    placeSelection: s.placeSelection,
    recolorSelection: s.recolorSelection,
    deleteSelection: s.deleteSelection,
    duplicateSelection: s.duplicateSelection,
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [typedCommand, setTypedCommand] = useState('');
  const handleRef = useRef<DictationHandle | null>(null);
  const transcriptRef = useRef('');
  const cancelledRef = useRef(false);
  const recognitionErrorRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const pendingClearRef = useRef(false);
  const executorContextRef = useRef<VoiceExecutorContext>({ lastNudge: null });
  const speechSupported = isSpeechSupported();

  const closePanel = useCallback((restoreFocus = true) => {
    cancelledRef.current = true;
    const handle = handleRef.current;
    handleRef.current = null;
    handle?.stop();
    setListening(false);
    setPanelOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      closePanel(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [closePanel, panelOpen]);

  /** Show the feedback and say it aloud when the voice preference is on. */
  const announce = (text: string) => {
    setMessage(text);
    const { voiceFeedback, locale } = useUiPrefs.getState();
    if (voiceFeedback) say(text, { lang: locale });
  };

  const runTranscript = (text: string) => {
    setTranscript(text);
    const command = parseVoiceCommand(text, useUiPrefs.getState().locale);

    // A pending "clear this layer?" confirmation intercepts yes/no first.
    if (pendingClearRef.current) {
      pendingClearRef.current = false;
      executorContextRef.current.lastNudge = null;
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
      executorContextRef.current.lastNudge = null;
      announce(t('voice.unknown'));
      return;
    }
    // The storyboard owns the next focused modal surface. Close this popover
    // before opening it so two conversations never compete for attention.
    if (command.kind === 'storyboard') setPanelOpen(false);
    const result = executeVoiceCommand(
      command,
      executorStore(announce),
      () => void saveNow(),
      executorContextRef.current,
    );
    if (!result) return;
    if (result.awaitConfirm === 'clear') pendingClearRef.current = true;
    announce(result.message);
  };

  const startListening = () => {
    setPanelOpen(true);
    setMessage(null);
    setTranscript('');
    transcriptRef.current = '';
    cancelledRef.current = false;
    recognitionErrorRef.current = false;
    const handle = startDictation(
      {
        onText: (text) => {
          transcriptRef.current = text;
          setTranscript(text);
        },
        onError: (reason) => {
          recognitionErrorRef.current = true;
          executorContextRef.current.lastNudge = null;
          announce(t(reason === 'not-allowed' ? 'voice.microphoneOff' : 'voice.couldNotHear'));
        },
        onEnd: () => {
          handleRef.current = null;
          setListening(false);
          if (cancelledRef.current) {
            cancelledRef.current = false;
            transcriptRef.current = '';
            return;
          }
          if (recognitionErrorRef.current) {
            recognitionErrorRef.current = false;
            transcriptRef.current = '';
            return;
          }
          const text = transcriptRef.current.trim();
          transcriptRef.current = '';
          if (text) runTranscript(text);
          else {
            executorContextRef.current.lastNudge = null;
            announce(t('voice.noTranscript'));
          }
        },
      },
      { lang: speechLanguage(useUiPrefs.getState().locale) },
    );
    if (handle) {
      handleRef.current = handle;
      setListening(true);
      return;
    }
    announce(t('voice.unavailable'));
  };

  const toggle = () => {
    if (!speechSupported) {
      setPanelOpen(true);
      setTranscript('');
      announce(t('voice.unavailable'));
      window.requestAnimationFrame(() => commandInputRef.current?.focus());
      return;
    }
    if (handleRef.current) {
      handleRef.current.stop();
      return; // onend runs the transcript
    }
    startListening();
  };

  return (
    <div className="voice-commands">
      <button
        ref={buttonRef}
        type="button"
        className={`btn icon-btn${listening ? ' primary listening' : ''}`}
        aria-pressed={listening}
        aria-expanded={panelOpen}
        aria-controls="voice-conversation"
        aria-label={listening ? t('toolbar.stopListening') : t('toolbar.voiceCommands')}
        data-tooltip={
          listening
            ? undefined
            : t(speechSupported ? 'toolbar.voiceCommandsTitle' : 'voice.unavailable')
        }
        onClick={toggle}
      >
        <MicIcon />
      </button>
      {message && !panelOpen && (
        <span className="voice-message" role="status">
          {message}
        </span>
      )}
      {panelOpen && (
        <section
          ref={panelRef}
          id="voice-conversation"
          className="voice-conversation"
          role="dialog"
          aria-label={t('voice.panelTitle')}
        >
          <header className="voice-conversation-header">
            <div>
              <strong>{t('voice.panelTitle')}</strong>
              <span>{t(listening ? 'voice.listeningNow' : 'voice.ready')}</span>
            </div>
            <button type="button" className="btn" onClick={() => closePanel()}>
              {t('common.close')}
            </button>
          </header>

          {listening && (
            <div className="voice-wave" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          )}

          {transcript && (
            <div className="voice-transcript">
              <span>{t('voice.heard')}</span>
              <q>{transcript}</q>
            </div>
          )}

          {message && (
            <p className="voice-conversation-message" role="status">
              {message}
            </p>
          )}

          <p className="voice-examples">{t('voice.examples')}</p>

          <form
            className="voice-command-form"
            onSubmit={(event) => {
              event.preventDefault();
              const text = typedCommand.trim();
              if (!text) return;
              setTypedCommand('');
              runTranscript(text);
            }}
          >
            <label htmlFor="voice-command-input">{t('voice.typeLabel')}</label>
            <div>
              <input
                ref={commandInputRef}
                id="voice-command-input"
                value={typedCommand}
                placeholder={t('voice.typePlaceholder')}
                onChange={(event) => setTypedCommand(event.target.value)}
              />
              <button type="submit" className="btn primary" disabled={!typedCommand.trim()}>
                {t('voice.doIt')}
              </button>
            </div>
          </form>

          {speechSupported && (
            <button type="button" className="btn voice-retry" onClick={toggle}>
              {t(listening ? 'toolbar.stopListening' : 'voice.speakAgain')}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
