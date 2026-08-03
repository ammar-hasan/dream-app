/** Voice executor: intents map to the right store actions + friendly messages. */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAnimation } from '../engine/animation';
import { createDocument, createLayer } from '../engine/document';
import { useUiPrefs } from '../store/uiPrefs';
import {
  cancelClear,
  confirmClear,
  executeVoiceCommand,
  type VoiceExecutorContext,
  type VoiceExecutorStore,
} from './voiceExecutor';

function makeStore(overrides: Partial<VoiceExecutorStore> = {}) {
  const store: VoiceExecutorStore = {
    doc: createDocument({ width: 100, height: 100 }),
    canUndo: false,
    canRedo: false,
    settings: { size: 8 },
    activeLayerHasContent: true,
    selectionCount: 0,
    selectionTransformable: false,
    selectionRecolorable: false,
    undo: vi.fn(),
    redo: vi.fn(),
    clearLayer: vi.fn(),
    toggleAnimation: vi.fn(),
    addFrame: vi.fn(),
    openStoryboard: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    setMode: vi.fn(),
    startGame: vi.fn(),
    stopGame: vi.fn(),
    setGameTemplate: vi.fn(),
    previewApp: vi.fn(),
    exportApp: vi.fn(),
    exportCode: vi.fn(),
    setTool: vi.fn(),
    setColor: vi.fn(),
    setSize: vi.fn(),
    scaleSelection: vi.fn(),
    nudgeSelection: vi.fn(),
    centerSelection: vi.fn(),
    placeSelection: vi.fn(),
    recolorSelection: vi.fn(),
    deleteSelection: vi.fn(),
    duplicateSelection: vi.fn(),
    setSymmetry: vi.fn(),
    narrationRecording: false,
    startNarration: vi.fn(),
    stopNarration: vi.fn(),
    deleteNarration: vi.fn(),
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

  it('opens the confirmable storyboard flow with a spoken idea', () => {
    const store = makeStore();
    expect(
      executeVoiceCommand({ kind: 'storyboard', prompt: 'a moon who meets a fox' }, store, () => {})
        ?.message,
    ).toBe('Here’s your storyboard — check it, then make it move!');
    expect(store.openStoryboard).toHaveBeenCalledWith('a moon who meets a fox');
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

  it('"export real code" needs frames, then runs the code export', () => {
    const store = makeStore();
    expect(executeVoiceCommand({ kind: 'export-code' }, store, () => {})?.message).toBe(
      'Add some frames and links first.',
    );
    expect(store.exportCode).not.toHaveBeenCalled();

    const animated = makeStore({
      doc: {
        ...createDocument({ width: 10, height: 10 }),
        frames: [{ id: 'f1', layers: [createLayer('L1')] }],
        activeFrameId: 'f1',
      },
    });
    expect(executeVoiceCommand({ kind: 'export-code' }, animated, () => {})?.message).toBe(
      'Dreaming in code…',
    );
    expect(animated.exportCode).toHaveBeenCalledOnce();
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

  it('“make it red” recolors only an editable vector selection', () => {
    const selected = makeStore({
      selectionCount: 1,
      selectionTransformable: true,
      selectionRecolorable: true,
    });
    expect(
      executeVoiceCommand(
        { kind: 'color', color: '#ef4444', name: 'red', selection: true },
        selected,
        () => {},
      )?.message,
    ).toBe('Made the selected part red.');
    expect(selected.recolorSelection).toHaveBeenCalledWith('#ef4444');
    expect(selected.setColor).not.toHaveBeenCalled();

    const pixels = makeStore({
      selectionCount: 1,
      selectionTransformable: true,
      selectionRecolorable: false,
    });
    expect(
      executeVoiceCommand(
        { kind: 'color', color: '#ef4444', name: 'red', selection: true },
        pixels,
        () => {},
      )?.message,
    ).toMatch(/pixels/i);
    expect(pixels.recolorSelection).not.toHaveBeenCalled();
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

  it('bigger/smaller resolve “it” to selected artwork and respect a locked layer', () => {
    const selected = makeStore({ selectionCount: 2, selectionTransformable: true });
    expect(executeVoiceCommand({ kind: 'bigger' }, selected, () => {})?.message).toBe(
      'Made the selected part bigger.',
    );
    expect(selected.scaleSelection).toHaveBeenCalledWith(1.15);
    expect(selected.setSize).not.toHaveBeenCalled();

    executeVoiceCommand({ kind: 'smaller' }, selected, () => {});
    expect(selected.scaleSelection).toHaveBeenLastCalledWith(1 / 1.15);

    const locked = makeStore({ selectionCount: 1, selectionTransformable: false });
    expect(executeVoiceCommand({ kind: 'bigger' }, locked, () => {})?.message).toMatch(/locked/i);
    expect(locked.scaleSelection).not.toHaveBeenCalled();
    expect(locked.setSize).not.toHaveBeenCalled();
  });

  it('delete/duplicate resolve “it” only to an editable visible selection', () => {
    const empty = makeStore();
    expect(executeVoiceCommand({ kind: 'delete-selection' }, empty, () => {})?.message).toMatch(
      /select something first/i,
    );
    expect(empty.deleteSelection).not.toHaveBeenCalled();

    const selected = makeStore({ selectionCount: 2, selectionTransformable: true });
    expect(executeVoiceCommand({ kind: 'delete-selection' }, selected, () => {})?.message).toMatch(
      /deleted/i,
    );
    expect(selected.deleteSelection).toHaveBeenCalledOnce();
    expect(
      executeVoiceCommand({ kind: 'duplicate-selection' }, selected, () => {})?.message,
    ).toMatch(/copy/i);
    expect(selected.duplicateSelection).toHaveBeenCalledOnce();

    const locked = makeStore({ selectionCount: 1, selectionTransformable: false });
    expect(executeVoiceCommand({ kind: 'duplicate-selection' }, locked, () => {})?.message).toMatch(
      /locked/i,
    );
    expect(locked.duplicateSelection).not.toHaveBeenCalled();
  });

  it('moves or centers only an editable visible selection', () => {
    const empty = makeStore();
    expect(
      executeVoiceCommand({ kind: 'move-selection', direction: 'left' }, empty, () => {})?.message,
    ).toMatch(/select something first/i);
    expect(empty.nudgeSelection).not.toHaveBeenCalled();

    const selected = makeStore({ selectionCount: 1, selectionTransformable: true });
    expect(
      executeVoiceCommand({ kind: 'move-selection', direction: 'left' }, selected, () => {})
        ?.message,
    ).toBe('Moved the selected part left.');
    expect(selected.nudgeSelection).toHaveBeenCalledWith(-10, 0);

    executeVoiceCommand({ kind: 'move-selection', direction: 'right' }, selected, () => {});
    executeVoiceCommand({ kind: 'move-selection', direction: 'up' }, selected, () => {});
    executeVoiceCommand({ kind: 'move-selection', direction: 'down' }, selected, () => {});
    expect(selected.nudgeSelection).toHaveBeenNthCalledWith(2, 10, 0);
    expect(selected.nudgeSelection).toHaveBeenNthCalledWith(3, 0, -10);
    expect(selected.nudgeSelection).toHaveBeenNthCalledWith(4, 0, 10);

    expect(
      executeVoiceCommand({ kind: 'move-selection', direction: 'center' }, selected, () => {})
        ?.message,
    ).toBe('Centered the selected part.');
    expect(selected.centerSelection).toHaveBeenCalledOnce();

    const locked = makeStore({ selectionCount: 1, selectionTransformable: false });
    expect(
      executeVoiceCommand({ kind: 'move-selection', direction: 'right' }, locked, () => {})
        ?.message,
    ).toMatch(/locked/i);
    expect(locked.nudgeSelection).not.toHaveBeenCalled();
    expect(locked.centerSelection).not.toHaveBeenCalled();
  });

  it('clarifies an ambiguous move only when artwork can move', () => {
    const empty = makeStore();
    expect(
      executeVoiceCommand({ kind: 'clarify-selection-move' }, empty, () => {})?.message,
    ).toMatch(/select something first/i);

    const selected = makeStore({ selectionCount: 1, selectionTransformable: true });
    expect(executeVoiceCommand({ kind: 'clarify-selection-move' }, selected, () => {})).toEqual({
      message: 'Which way — left, right, up or down?',
      awaitClarify: 'selection-direction',
    });
    expect(selected.nudgeSelection).not.toHaveBeenCalled();

    const locked = makeStore({ selectionCount: 1, selectionTransformable: false });
    expect(
      executeVoiceCommand({ kind: 'clarify-selection-move' }, locked, () => {})?.message,
    ).toMatch(/locked/i);
  });

  it('places only an editable visible selection at a named canvas edge', () => {
    const empty = makeStore();
    expect(
      executeVoiceCommand({ kind: 'place-selection', edge: 'top' }, empty, () => {})?.message,
    ).toMatch(/select something first/i);
    expect(empty.placeSelection).not.toHaveBeenCalled();

    const selected = makeStore({ selectionCount: 1, selectionTransformable: true });
    for (const edge of ['left', 'right', 'top', 'bottom'] as const) {
      expect(
        executeVoiceCommand({ kind: 'place-selection', edge }, selected, () => {})?.message,
      ).toMatch(new RegExp(`${edge} edge`, 'i'));
    }
    expect(selected.placeSelection).toHaveBeenNthCalledWith(1, 'left');
    expect(selected.placeSelection).toHaveBeenNthCalledWith(2, 'right');
    expect(selected.placeSelection).toHaveBeenNthCalledWith(3, 'top');
    expect(selected.placeSelection).toHaveBeenNthCalledWith(4, 'bottom');

    const locked = makeStore({ selectionCount: 1, selectionTransformable: false });
    expect(
      executeVoiceCommand({ kind: 'place-selection', edge: 'bottom' }, locked, () => {})?.message,
    ).toMatch(/locked/i);
    expect(locked.placeSelection).not.toHaveBeenCalled();
  });

  it('repeats only the immediately preceding successful directional nudge', () => {
    const context: VoiceExecutorContext = { lastNudge: null };
    const selected = makeStore({ selectionCount: 1, selectionTransformable: true });

    expect(
      executeVoiceCommand({ kind: 'repeat-selection-move' }, selected, () => {}, context)?.message,
    ).toBe('Move something first, then say again.');
    expect(selected.nudgeSelection).not.toHaveBeenCalled();

    executeVoiceCommand(
      { kind: 'move-selection', direction: 'right' },
      selected,
      () => {},
      context,
    );
    expect(context.lastNudge).toBe('right');
    executeVoiceCommand({ kind: 'repeat-selection-move' }, selected, () => {}, context);
    expect(selected.nudgeSelection).toHaveBeenNthCalledWith(1, 10, 0);
    expect(selected.nudgeSelection).toHaveBeenNthCalledWith(2, 10, 0);

    executeVoiceCommand(
      { kind: 'color', color: '#ef4444', name: 'red' },
      selected,
      () => {},
      context,
    );
    expect(context.lastNudge).toBeNull();
    executeVoiceCommand({ kind: 'repeat-selection-move' }, selected, () => {}, context);
    expect(selected.nudgeSelection).toHaveBeenCalledTimes(2);

    executeVoiceCommand({ kind: 'move-selection', direction: 'left' }, selected, () => {}, context);
    executeVoiceCommand(
      { kind: 'move-selection', direction: 'center' },
      selected,
      () => {},
      context,
    );
    expect(context.lastNudge).toBeNull();

    const missing = makeStore();
    executeVoiceCommand({ kind: 'move-selection', direction: 'up' }, missing, () => {}, context);
    expect(context.lastNudge).toBeNull();
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

  it('record narration needs frames, then starts the take', () => {
    const store = makeStore(); // no frames yet
    expect(executeVoiceCommand({ kind: 'record-narration' }, store, () => {})?.message).toBe(
      'Add some frames first, then tell your story!',
    );
    expect(store.startNarration).not.toHaveBeenCalled();

    const animated = makeStore({ doc: enableAnimation(createDocument({ width: 8, height: 8 })) });
    expect(executeVoiceCommand({ kind: 'record-narration' }, animated, () => {})?.message).toBe(
      'Recording — tell your story!',
    );
    expect(animated.startNarration).toHaveBeenCalledOnce();

    // Already recording: a second "record narration" is a no-op with a hint.
    const midTake = makeStore({
      doc: enableAnimation(createDocument({ width: 8, height: 8 })),
      narrationRecording: true,
    });
    expect(executeVoiceCommand({ kind: 'record-narration' }, midTake, () => {})?.message).toMatch(
      /already recording/i,
    );
    expect(midTake.startNarration).not.toHaveBeenCalled();
  });

  it('stop recording saves the take only while recording', () => {
    const store = makeStore({ narrationRecording: true });
    expect(executeVoiceCommand({ kind: 'stop-recording' }, store, () => {})?.message).toBe(
      'Your story is saved!',
    );
    expect(store.stopNarration).toHaveBeenCalledOnce();

    const idle = makeStore();
    expect(executeVoiceCommand({ kind: 'stop-recording' }, idle, () => {})?.message).toBe(
      'I’m not recording right now.',
    );
    expect(idle.stopNarration).not.toHaveBeenCalled();
  });

  it('delete narration removes the take when one exists', () => {
    const store = makeStore();
    expect(executeVoiceCommand({ kind: 'delete-narration' }, store, () => {})?.message).toBe(
      'There’s no narration yet.',
    );
    expect(store.deleteNarration).not.toHaveBeenCalled();

    const withTake = makeStore({
      doc: {
        ...createDocument({ width: 8, height: 8 }),
        narration: { audio: 'data:audio/webm;base64,AAAA', durationMs: 1000 },
      },
    });
    expect(executeVoiceCommand({ kind: 'delete-narration' }, withTake, () => {})?.message).toBe(
      'Narration deleted.',
    );
    expect(withTake.deleteNarration).toHaveBeenCalledOnce();
  });
});
