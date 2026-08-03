import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockAIProvider, setActiveProvider, type AIProvider } from '../ai/registry';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { paintStoryboard, StoryboardDialog } from './StoryboardDialog';

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = '';
  interimResults = false;
  continuous = true;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {}
  stop() {}
}

const speechGlobal = globalThis as { webkitSpeechRecognition?: unknown };

beforeEach(() => {
  localStorage.clear();
  setActiveProvider('mock');
  useUiPrefs.getState().setKidMode(false);
  useDreamStore.getState().newDocument({ width: 8, height: 8, name: 'Story' });
});

afterEach(() => {
  cleanup();
  delete speechGlobal.webkitSpeechRecognition;
  FakeRecognition.instances = [];
});

describe('paintStoryboard', () => {
  it('paints reviewed scenes sequentially and reports progress', async () => {
    const mock = new MockAIProvider();
    const generateImage = vi.spyOn(mock, 'generateImage');
    const progress = vi.fn();
    const result = await paintStoryboard(
      {
        story: 'Moon meets fox',
        scenes: [{ description: 'Moon wakes' }, { description: 'Fox waves' }],
      },
      mock,
      { width: 4, height: 3 },
      progress,
    );
    expect(generateImage).toHaveBeenCalledTimes(2);
    expect(generateImage.mock.calls[0][0].prompt).toContain('frame 1 of 2');
    expect(generateImage.mock.calls[1][0].prompt).toContain('Fox waves');
    expect(result.map((frame) => frame.caption)).toEqual(['Moon wakes', 'Fox waves']);
    // Dream AI's procedural painter keeps a tiny 8 px safety floor.
    expect(result[0].pixels).toMatchObject({ width: 8, height: 8 });
    expect(progress.mock.calls).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
    ]);
  });

  it('does not return a partial document batch when a provider fails', async () => {
    let calls = 0;
    const provider = {
      id: 'failing',
      name: 'Failing',
      capabilities: { generateImage: true, editImage: false, chat: false },
      generateImage: vi.fn(async () => {
        calls += 1;
        if (calls === 2) throw new Error('No picture');
        return {
          pixels: { width: 1, height: 1, data: new Uint8ClampedArray(4) },
          prompt: 'one',
          providerId: 'failing',
        };
      }),
    } as unknown as AIProvider;
    await expect(
      paintStoryboard(
        { story: 'Story', scenes: [{ description: 'One' }, { description: 'Two' }] },
        provider,
        { width: 1, height: 1 },
      ),
    ).rejects.toThrow('No picture');
  });
});

describe('StoryboardDialog', () => {
  it('plans immediately after Little Dreamer dictation without changing the document', () => {
    speechGlobal.webkitSpeechRecognition = FakeRecognition;
    useUiPrefs.getState().setKidMode(true);
    render(<StoryboardDialog onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Say it' }));
    act(() => {
      FakeRecognition.instances[0].onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: true, 0: { transcript: 'Moon wakes, then Fox waves' } },
        },
      });
    });

    expect(screen.getByText('Your storyboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Frame 1')).toHaveValue('Moon wakes');
    expect(screen.getByLabelText('Frame 2')).toHaveValue('Fox waves');
    expect(useDreamStore.getState().doc.frames).toBeUndefined();
  });

  it('shows a plan before mutation, then creates and plays one undoable frame batch', async () => {
    const onClose = vi.fn();
    render(<StoryboardDialog onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('What happens in your story?'), {
      target: { value: 'Moon wakes up, then Fox waves hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Plan my frames' }));
    expect(screen.getByText('Your storyboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Frame 1')).toHaveValue('Moon wakes up');
    expect(screen.getByLabelText('Frame 2')).toHaveValue('Fox waves hello');
    expect(useDreamStore.getState().doc.frames).toBeUndefined();

    fireEvent.change(screen.getByLabelText('What happens in your story?'), {
      target: { value: 'Moon shines, then Fox waves hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Plan again' }));
    expect(screen.getByLabelText('Frame 1')).toHaveValue('Moon shines');
    fireEvent.change(screen.getByLabelText('Frame 2'), {
      target: { value: 'Fox smiles and waves' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Make animation' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const store = useDreamStore.getState();
    expect(store.doc.frames).toHaveLength(2);
    expect(store.doc.frames?.map((frame) => frame.presentation?.caption)).toEqual([
      'Moon shines',
      'Fox smiles and waves',
    ]);
    expect(store.doc.frames?.every((frame) => frame.layers[0].operations[0].kind === 'image')).toBe(
      true,
    );
    expect(store.doc.animation?.fps).toBe(1);
    expect(store.playing).toBe(true);

    store.undo();
    expect(useDreamStore.getState().doc.frames).toBeUndefined();
  });
});
