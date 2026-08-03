/**
 * Voice input for the AI prompt boxes (Web Speech API). All
 * SpeechRecognition types and feature detection live in this one module —
 * browsers without support (or without mic permission) simply get
 * `isSpeechSupported() === false` and the mic button stays hidden.
 */

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function resolveCtor(): SpeechRecognitionCtor | null {
  const w = globalThis as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechSupported(): boolean {
  return resolveCtor() !== null;
}

export interface DictationCallbacks {
  /** Called with the growing transcript (interim + final). */
  onText(text: string): void;
  /** Stable reason code; the consuming surface owns localized guidance. */
  onError?(reason: 'not-allowed' | 'unheard'): void;
  onEnd?(): void;
}

export interface DictationHandle {
  stop(): void;
}

/**
 * Start listening; returns null when speech recognition is unsupported.
 * The transcript is streamed to onText until stop() or the session ends.
 * `options.lang` sets the recognition language (e.g. the UI locale, so Arabic
 * commands are recognized as Arabic); defaults to the browser language.
 */
export function startDictation(
  callbacks: DictationCallbacks,
  options?: { lang?: string },
): DictationHandle | null {
  const Ctor = resolveCtor();
  if (!Ctor) return null;
  let recognition: SpeechRecognitionLike;
  try {
    recognition = new Ctor();
  } catch {
    return null;
  }
  recognition.lang = options?.lang || globalThis.navigator?.language || 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    let text = '';
    for (let i = 0; i < event.results.length; i += 1) {
      text += event.results[i][0].transcript;
    }
    callbacks.onText(text.trim());
  };
  recognition.onerror = (event) => {
    callbacks.onError?.(event.error === 'not-allowed' ? 'not-allowed' : 'unheard');
  };
  recognition.onend = () => callbacks.onEnd?.();

  try {
    recognition.start();
  } catch {
    return null;
  }
  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    },
  };
}
