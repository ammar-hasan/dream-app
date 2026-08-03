import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUiPrefs } from '../store/uiPrefs';
import { DictateButton } from './DictateButton';

class FakeRecognition {
  static instance: FakeRecognition | null = null;
  lang = '';
  interimResults = false;
  continuous = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  stopped = false;
  constructor() {
    FakeRecognition.instance = this;
  }
  start() {}
  stop() {
    this.stopped = true;
  }
}

const speechGlobal = globalThis as { webkitSpeechRecognition?: unknown };

afterEach(() => {
  cleanup();
  delete speechGlobal.webkitSpeechRecognition;
  FakeRecognition.instance = null;
  useUiPrefs.getState().setLocale('en');
});

describe('DictateButton', () => {
  it('dictates in the active locale and can stop listening', () => {
    speechGlobal.webkitSpeechRecognition = FakeRecognition;
    useUiPrefs.getState().setLocale('ar');
    const onText = vi.fn();
    render(<DictateButton onText={onText} />);

    const button = screen.getByRole('button', { name: 'تحدث' });
    fireEvent.click(button);
    const recognition = FakeRecognition.instance!;
    expect(recognition.lang).toBe('ar-SA');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    recognition.onresult?.({
      resultIndex: 0,
      results: { length: 1, 0: { isFinal: true, 0: { transcript: 'لعبة متاهة' } } },
    });
    expect(onText).toHaveBeenCalledWith('لعبة متاهة');

    fireEvent.click(button);
    expect(recognition.stopped).toBe(true);
  });

  it('asks speech recognition for Iranian Persian', () => {
    speechGlobal.webkitSpeechRecognition = FakeRecognition;
    useUiPrefs.getState().setLocale('fa');
    render(<DictateButton onText={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'بگو' }));
    expect(FakeRecognition.instance?.lang).toBe('fa-IR');
  });
});
