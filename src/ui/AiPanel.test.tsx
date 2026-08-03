import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerProvider,
  setActiveProvider,
  type AIImageRequest,
  type AIProvider,
  unregisterProvider,
} from '../ai/registry';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { AiPanel } from './AiPanel';

let capturedSignal: AbortSignal | undefined;
let finishRequest: (() => void) | undefined;

const pendingProvider = {
  id: 'openai-compatible',
  name: 'Pending test AI',
  capabilities: { generateImage: true, editImage: true, chat: true },
  generateImage: vi.fn(
    (request: AIImageRequest) =>
      new Promise((resolve) => {
        capturedSignal = request.signal;
        finishRequest = () =>
          resolve({
            pixels: { width: 1, height: 1, data: new Uint8ClampedArray(4) },
            prompt: request.prompt,
            providerId: 'openai-compatible',
          });
      }),
  ),
  editImage: vi.fn(),
  chat: vi.fn(),
  getFeedback: vi.fn(),
} as unknown as AIProvider;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  capturedSignal = undefined;
  finishRequest = undefined;
  registerProvider(pendingProvider);
  setActiveProvider('openai-compatible');
  useUiPrefs.getState().setLocale('en');
  useDreamStore.getState().newDocument({ width: 16, height: 12, name: 'Cancel test' });
});

afterEach(() => {
  cleanup();
  setActiveProvider('mock');
  unregisterProvider('openai-compatible');
  vi.useRealTimers();
});

describe('AI operation progress', () => {
  it('explains indeterminate progress and safely cancels without applying a late result', async () => {
    const layersBefore = useDreamStore.getState().doc.layers.length;
    render(<AiPanel />);

    fireEvent.change(screen.getByLabelText('What should I paint?'), {
      target: { value: 'A patient dinosaur' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Make it!' }));

    expect(screen.getByRole('progressbar', { name: 'Sending your request…' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();

    act(() => vi.advanceTimersByTime(5_000));
    expect(
      screen.getByRole('progressbar', { name: 'Dream is painting the details…' }),
    ).toBeVisible();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await Promise.resolve();
    });

    expect(capturedSignal?.aborted).toBe(true);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('Stopped. Nothing was changed.')).toBeVisible();
    expect(useDreamStore.getState().doc.layers).toHaveLength(layersBefore);

    await act(async () => {
      finishRequest?.();
      await Promise.resolve();
    });
    expect(useDreamStore.getState().doc.layers).toHaveLength(layersBefore);
  });
});
