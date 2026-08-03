/** Speech module: feature detection and dictation wiring (mocked SpeechRecognition). */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSpeechSupported, startDictation } from './speech';

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = '';
  interimResults = false;
  continuous = true;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  stopped = false;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
}

const g = globalThis as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };

afterEach(() => {
  delete g.webkitSpeechRecognition;
  delete g.SpeechRecognition;
  FakeRecognition.instances = [];
  vi.unstubAllGlobals();
});

describe('speech feature detection', () => {
  it('is unsupported in a bare environment', () => {
    expect(isSpeechSupported()).toBe(false);
    expect(startDictation({ onText: () => {} })).toBeNull();
  });

  it('detects the prefixed constructor', () => {
    g.webkitSpeechRecognition = FakeRecognition;
    expect(isSpeechSupported()).toBe(true);
  });
});

describe('startDictation', () => {
  it('streams transcripts to onText and stops cleanly', () => {
    g.webkitSpeechRecognition = FakeRecognition;
    const texts: string[] = [];
    const handle = startDictation({ onText: (t) => texts.push(t) });
    expect(handle).not.toBeNull();
    const rec = FakeRecognition.instances[0];
    expect(rec.started).toBe(true);
    expect(rec.interimResults).toBe(true);

    rec.onresult?.({
      resultIndex: 0,
      results: { length: 1, 0: { isFinal: false, 0: { transcript: 'a red cat' } } },
    });
    expect(texts).toEqual(['a red cat']);

    handle!.stop();
    expect(rec.stopped).toBe(true);
  });

  it('classifies mic-permission denial for localized guidance', () => {
    g.webkitSpeechRecognition = FakeRecognition;
    const onError = vi.fn();
    startDictation({ onText: () => {}, onError });
    FakeRecognition.instances[0].onerror?.({ error: 'not-allowed' });
    expect(onError).toHaveBeenCalledWith('not-allowed');
  });

  it('classifies other recognition failures without exposing browser jargon', () => {
    g.webkitSpeechRecognition = FakeRecognition;
    const onError = vi.fn();
    startDictation({ onText: () => {}, onError });
    FakeRecognition.instances[0].onerror?.({ error: 'network' });
    expect(onError).toHaveBeenCalledWith('unheard');
  });

  it('notifies when the session ends', () => {
    g.webkitSpeechRecognition = FakeRecognition;
    const onEnd = vi.fn();
    startDictation({ onText: () => {}, onEnd });
    FakeRecognition.instances[0].onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
