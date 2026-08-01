/** Say module: feature detection and utterance wiring (mocked speechSynthesis). */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSaySupported, say, stopSpeaking } from './say';

class FakeUtterance {
  static instances: FakeUtterance[] = [];
  text: string;
  lang = '';
  constructor(text: string) {
    this.text = text;
    FakeUtterance.instances.push(this);
  }
}

const fakeSynth = { cancel: vi.fn(), speak: vi.fn() };

const g = globalThis as {
  speechSynthesis?: unknown;
  SpeechSynthesisUtterance?: unknown;
};

afterEach(() => {
  delete g.speechSynthesis;
  delete g.SpeechSynthesisUtterance;
  FakeUtterance.instances = [];
  vi.clearAllMocks();
});

describe('say feature detection', () => {
  it('is unsupported in a bare environment', () => {
    expect(isSaySupported()).toBe(false);
    expect(say('Brush!')).toBe(false);
  });

  it('needs both speechSynthesis and the utterance constructor', () => {
    g.speechSynthesis = fakeSynth;
    expect(isSaySupported()).toBe(false);
    g.SpeechSynthesisUtterance = FakeUtterance;
    expect(isSaySupported()).toBe(true);
  });
});

describe('say', () => {
  it('cancels the previous utterance and speaks the new one', () => {
    g.speechSynthesis = fakeSynth;
    g.SpeechSynthesisUtterance = FakeUtterance;
    expect(say('Brush!')).toBe(true);
    expect(fakeSynth.cancel).toHaveBeenCalledOnce();
    expect(fakeSynth.speak).toHaveBeenCalledOnce();
    expect(FakeUtterance.instances[0].text).toBe('Brush!');
  });

  it('applies an optional language', () => {
    g.speechSynthesis = fakeSynth;
    g.SpeechSynthesisUtterance = FakeUtterance;
    say('فرشاة!', { lang: 'ar' });
    expect(FakeUtterance.instances[0].lang).toBe('ar');
  });

  it('stays silent on empty text', () => {
    g.speechSynthesis = fakeSynth;
    g.SpeechSynthesisUtterance = FakeUtterance;
    expect(say('   ')).toBe(false);
    expect(fakeSynth.speak).not.toHaveBeenCalled();
  });

  it('returns false when speaking throws', () => {
    g.speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(() => {
        throw new Error('nope');
      }),
    };
    g.SpeechSynthesisUtterance = FakeUtterance;
    expect(say('Brush!')).toBe(false);
  });
});

describe('stopSpeaking', () => {
  it('cancels the current utterance', () => {
    g.speechSynthesis = fakeSynth;
    stopSpeaking();
    expect(fakeSynth.cancel).toHaveBeenCalledOnce();
  });

  it('is a no-op without support', () => {
    expect(() => stopSpeaking()).not.toThrow();
  });
});
