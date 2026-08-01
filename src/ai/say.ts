/**
 * Spoken output (speech synthesis) — the mirror of `speech.ts` (spoken
 * input). All `speechSynthesis` types and feature detection live in this one
 * module: browsers without support simply get `isSaySupported() === false`
 * and every `say()` becomes a silent no-op.
 */

interface SpeechSynthesisUtteranceLike {
  text: string;
  lang: string;
}

interface SpeechSynthesisLike {
  cancel(): void;
  speak(utterance: SpeechSynthesisUtteranceLike): void;
}

function resolveSynth(): SpeechSynthesisLike | null {
  const g = globalThis as { speechSynthesis?: SpeechSynthesisLike };
  return g.speechSynthesis ?? null;
}

function resolveUtteranceCtor(): (new (text: string) => SpeechSynthesisUtteranceLike) | null {
  const g = globalThis as {
    SpeechSynthesisUtterance?: new (text: string) => SpeechSynthesisUtteranceLike;
  };
  return g.SpeechSynthesisUtterance ?? null;
}

export function isSaySupported(): boolean {
  return resolveSynth() !== null && resolveUtteranceCtor() !== null;
}

/**
 * Speak `text` aloud, replacing anything currently being said. Returns false
 * when speech synthesis is unavailable (callers stay silent and carry on).
 */
export function say(text: string, options?: { lang?: string }): boolean {
  const synth = resolveSynth();
  const Ctor = resolveUtteranceCtor();
  if (!synth || !Ctor || text.trim() === '') return false;
  try {
    synth.cancel(); // one voice at a time — a new tool name cuts the old one off
    const utterance = new Ctor(text);
    if (options?.lang) utterance.lang = options.lang;
    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

/** Stop whatever is being said right now. */
export function stopSpeaking(): void {
  try {
    resolveSynth()?.cancel();
  } catch {
    // already gone
  }
}
