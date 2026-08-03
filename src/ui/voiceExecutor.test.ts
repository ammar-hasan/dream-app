/** Voice executor: intents map to the right store actions + friendly messages. */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocument, createLayer } from '../engine/document';
import { useUiPrefs } from '../store/uiPrefs';
import {
  cancelClear,
  confirmClear,
  executeVoiceCommand,
  type VoiceExecutorStore,
} from './voiceExecutor';

function makeStore(overrides: Partial<VoiceExecutorStore> = {}) {
  const store: VoiceExecutorStore = {
    doc: createDocument({ width: 100, height: 100 }),
    canUndo: false,
    canRedo: false,
    settings: { size: 8 },
    activeLayerHasContent: true,
    undo: vi.fn(),
    redo: vi.fn(),
    clearLayer: vi.fn(),
    toggleAnimation: vi.fn(),
    addFrame: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    setMode: vi.fn(),
    startGame: vi.fn(),
    stopGame: vi.fn(),
    setGameTemplate: vi.fn(),
    previewApp: vi.fn(),
    exportApp: vi.fn(),
    setTool: vi.fn(),
    setColor: vi.fn(),
    setSize: vi.fn(),
    setSymmetry: vi.fn(),
    ...overrides,
  };
  return store;
}

beforeEach(() => {
  useUiPrefs.getState().setLocale('en');
});

describe('executeVoiceCommand', () => {
  it('undo/redo respect the history flags', () => {
    const store = makeStore();
    expect(executeVoiceCommand({ kind: 'undo' }, store, () => {})?.message).toBe(
      'Nothing to undo.',
    );
    expect(store.undo).not.toHaveBeenCalled();

    const store2 = makeStore({ canUndo: true });
    expect(executeVoiceCommand({ kind: 'undo' }, store2, () => {})?.message).toBe(
      'Took that back!',
    );
    expect(store2.undo).toHaveBeenCalledOnce();

    expect(executeVoiceCommand({ kind: 'redo' }, store, () => {})?.message).toBe(
      'Nothing to redo.',
    );
    const store3 = makeStore({ canRedo: true });
    executeVoiceCommand({ kind: 'redo' }, store3, () => {});
    expect(store3.redo).toHaveBeenCalledOnce();
  });

  it('clear asks for confirmation instead of deleting', () => {
    const store = makeStore();
    const result = executeVoiceCommand({ kind: 'clear' }, store, () => {});
    expect(result?.awaitConfirm).toBe('clear');
    expect(result?.message).toMatch(/say yes/i);
    expect(store.clearLayer).not.toHaveBeenCalled();
  });

  it('clear on an empty layer skips the confirmation', () => {
    const store = makeStore({ activeLayerHasContent: false });
    const result = executeVoiceCommand({ kind: 'clear' }, store, () => {});
    expect(result?.awaitConfirm).toBeUndefined();
    expect(result?.message).toBe('This layer is already empty.');
  });

  it('confirmClear runs the clear; cancelClear does not', () => {
    const store = makeStore();
    expect(confirmClear(store).message).toBe('All clear!');
    expect(store.clearLayer).toHaveBeenCalledOnce();
    expect(cancelClear().message).toMatch(/kept everything/i);
  });

  it('new frame enables animation first when needed', () => {
    const store = makeStore();
    executeVoiceCommand({ kind: 'new-frame' }, store, () => {});
    expect(store.toggleAnimation).toHaveBeenCalledOnce();
    expect(store.addFrame).toHaveBeenCalledOnce();

    const animated = makeStore({
      doc: { ...createDocument({ width: 10, height: 10 }), frames: [], activeFrameId: undefined },
    });
    executeVoiceCommand({ kind: 'new-frame' }, animated, () => {});
    expect(animated.toggleAnimation).not.toHaveBeenCalled();
    expect(animated.addFrame).toHaveBeenCalledOnce();
  });

  it('play needs frames; stop always pauses', () => {
    const store = makeStore();
    expect(executeVoiceCommand({ kind: 'play' }, store, () => {})?.message).toMatch(
      /nothing to play/i,
    );
    expect(store.play).not.toHaveBeenCalled();

    const animated = makeStore({
      doc: {
        ...createDocument({ width: 10, height: 10 }),
        frames: [{ id: 'f1', layers: [createLayer('L1')] }],
        activeFrameId: 'f1',
      },
    });
    expect(executeVoiceCommand({ kind: 'play' }, animated, () => {})?.message).toBe('Playing!');
    expect(animated.play).toHaveBeenCalledOnce();

    executeVoiceCommand({ kind: 'stop' }, animated, () => {});
    expect(animated.pause).toHaveBeenCalledOnce();
    expect(animated.stopGame).toHaveBeenCalledOnce();
  });

  it('"play my game" switches to Play mode and starts a run', () => {
    const store = makeStore();
    expect(executeVoiceCommand({ kind: 'play-game' }, store, () => {})?.message).toBe(
      'Let’s play your game!',
    );
    expect(store.setMode).toHaveBeenCalledWith('play');
    expect(store.startGame).toHaveBeenCalledOnce();
    expect(store.setGameTemplate).not.toHaveBeenCalled();
  });

  it('"play flappy" selects the template before starting the run', () => {
    const store = makeStore();
    executeVoiceCommand({ kind: 'play-game', template: 'flappy' }, store, () => {});
    expect(store.setGameTemplate).toHaveBeenCalledWith('flappy');
    expect(store.setMode).toHaveBeenCalledWith('play');
    expect(store.startGame).toHaveBeenCalledOnce();
  });

  it('"preview/export my app" need frames, then call the app actions', () => {
    const store = makeStore();
    expect(executeVoiceCommand({ kind: 'preview-app' }, store, () => {})?.message).toBe(
      'Add some frames and links first.',
    );
    expect(store.previewApp).not.toHaveBeenCalled();
    expect(executeVoiceCommand({ kind: 'export-app' }, store, () => {})?.message).toBe(
      'Add some frames and links first.',
    );
    expect(store.exportApp).not.toHaveBeenCalled();

    const animated = makeStore({
      doc: {
        ...createDocument({ width: 10, height: 10 }),
        frames: [{ id: 'f1', layers: [createLayer('L1')] }],
        activeFrameId: 'f1',
      },
    });
    expect(executeVoiceCommand({ kind: 'preview-app' }, animated, () => {})?.message).toBe(
      'Here’s your app!',
    );
    expect(animated.previewApp).toHaveBeenCalledOnce();
    expect(executeVoiceCommand({ kind: 'export-app' }, animated, () => {})?.message).toBe(
      'Exported your app!',
    );
    expect(animated.exportApp).toHaveBeenCalledOnce();
  });

  it('tool and color commands set tool settings', () => {
    const store = makeStore();
    expect(executeVoiceCommand({ kind: 'tool', tool: 'brush' }, store, () => {})?.message).toBe(
      'Brush!',
    );
    expect(store.setTool).toHaveBeenCalledWith('brush');

    const result = executeVoiceCommand(
      { kind: 'color', color: '#ef4444', name: 'red' },
      store,
      () => {},
    );
    expect(result?.message).toBe('Red!');
    expect(store.setColor).toHaveBeenCalledWith('#ef4444');
  });

  it('fill-color sets both color and tool', () => {
    const store = makeStore();
    const result = executeVoiceCommand(
      { kind: 'fill-color', color: '#3b82f6', name: 'blue' },
      store,
      () => {},
    );
    expect(store.setColor).toHaveBeenCalledWith('#3b82f6');
    expect(store.setTool).toHaveBeenCalledWith('fill');
    expect(result?.message).toBe('Blue! Fill bucket!');
  });

  it('mirror toggles vertical symmetry on and off', () => {
    const store = makeStore();
    expect(executeVoiceCommand({ kind: 'mirror', on: true }, store, () => {})?.message).toBe(
      'Mirror on!',
    );
    expect(store.setSymmetry).toHaveBeenCalledWith('vertical');

    expect(executeVoiceCommand({ kind: 'mirror', on: false }, store, () => {})?.message).toBe(
      'Mirror off.',
    );
    expect(store.setSymmetry).toHaveBeenCalledWith('off');
  });

  it('bigger/smaller step the brush size and clamp to 1..64', () => {
    const store = makeStore({ settings: { size: 8 } });
    executeVoiceCommand({ kind: 'bigger' }, store, () => {});
    expect(store.setSize).toHaveBeenCalledWith(12);

    const huge = makeStore({ settings: { size: 60 } });
    executeVoiceCommand({ kind: 'bigger' }, huge, () => {});
    expect(huge.setSize).toHaveBeenCalledWith(64);

    const tiny = makeStore({ settings: { size: 2 } });
    executeVoiceCommand({ kind: 'smaller' }, tiny, () => {});
    expect(tiny.setSize).toHaveBeenCalledWith(1);
  });

  it('save triggers the save callback; help speaks the command list', () => {
    const save = vi.fn();
    const store = makeStore();
    expect(executeVoiceCommand({ kind: 'save' }, store, save)?.message).toBe('Saved!');
    expect(save).toHaveBeenCalledOnce();
    expect(executeVoiceCommand({ kind: 'help' }, store, () => {})?.message).toMatch(/you can say/i);
  });

  it('confirm/cancel outside a pending confirmation do nothing', () => {
    const store = makeStore();
    expect(executeVoiceCommand({ kind: 'confirm' }, store, () => {})).toBeNull();
    expect(executeVoiceCommand({ kind: 'cancel' }, store, () => {})).toBeNull();
  });

  it('messages follow the active locale', () => {
    useUiPrefs.getState().setLocale('ar');
    const store = makeStore();
    expect(executeVoiceCommand({ kind: 'tool', tool: 'eraser' }, store, () => {})?.message).toBe(
      'ممحاة!',
    );
  });
});
