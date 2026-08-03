import { describe, expect, it } from 'vitest';
import {
  activeFrameIndex,
  animationDurationMs,
  animationSettingsOf,
  blankFrame,
  cloneFrame,
  DEFAULT_ANIMATION_SETTINGS,
  disableAnimation,
  enableAnimation,
  frameIndexAtTime,
  isAnimated,
  onionSkinTargets,
  presentationFrames,
  slideDurationMs,
  spriteSheetLayout,
} from './animation';
import {
  appendOperation,
  createDocument,
  createFrame,
  mapLayer,
  removeLayerById,
} from './document';
import {
  addFrameCommand,
  addOperationCommand,
  addStoryboardFramesCommand,
  duplicateFrameCommand,
  History,
  moveFrameCommand,
  removeFrameCommand,
  setFrameCaptionsCommand,
  setFramePresentationCommand,
  setAnimationEnabledCommand,
} from './history';
import type { StrokeOp } from './types';

const stroke = (id: string): StrokeOp => ({
  kind: 'stroke',
  id,
  tool: 'brush',
  points: [{ x: 1, y: 1 }],
  color: '#000000',
  size: 4,
  opacity: 1,
});

describe('enable/disable animation', () => {
  it('wraps the current layers into frame 1, keeping them mirrored', () => {
    const base = createDocument({ width: 10, height: 10 });
    const withOp = appendOperation(base, base.layers[0].id, stroke('a'));
    const animated = enableAnimation(withOp);
    expect(isAnimated(animated)).toBe(true);
    expect(animated.frames).toHaveLength(1);
    expect(animated.activeFrameId).toBe(animated.frames?.[0].id);
    // doc.layers still mirrors the frame's stack.
    expect(animated.layers).toBe(animated.frames?.[0].layers);
    expect(animated.layers[0].operations).toHaveLength(1);
  });

  it('disable keeps the active stack and drops the frame model', () => {
    const animated = enableAnimation(createDocument({ width: 10, height: 10 }));
    const plain = disableAnimation(animated);
    expect(isAnimated(plain)).toBe(false);
    expect(plain.frames).toBeUndefined();
    expect(plain.activeFrameId).toBeUndefined();
    expect(plain.layers).toHaveLength(1);
  });

  it('is a no-op in the already-requested state', () => {
    const plain = createDocument({ width: 10, height: 10 });
    expect(enableAnimation(enableAnimation(plain)).frames).toHaveLength(1);
    expect(disableAnimation(plain)).toBe(plain);
  });
});

describe('frame-aware document helpers', () => {
  it('edits to the active stack write through to the active frame', () => {
    const doc = enableAnimation(createDocument({ width: 10, height: 10 }));
    const layerId = doc.layers[0].id;
    const next = appendOperation(doc, layerId, stroke('op-1'));
    expect(next.layers[0].operations).toHaveLength(1);
    expect(next.frames?.[0].layers[0].operations).toHaveLength(1);
    expect(next.frames?.[0].layers).toBe(next.layers);
  });

  it('mapLayer finds a layer in a non-active frame (cross-frame undo)', () => {
    let doc = enableAnimation(createDocument({ width: 10, height: 10 }));
    const frameALayer = doc.layers[0].id;
    doc = {
      ...doc,
      frames: [...(doc.frames ?? []), blankFrame()],
    };
    doc = { ...doc, activeFrameId: doc.frames?.[1].id, layers: doc.frames?.[1].layers ?? [] };
    expect(doc.layers.some((l) => l.id === frameALayer)).toBe(false);

    const next = mapLayer(doc, frameALayer, (l) => ({ ...l, name: 'Ghost' }));
    expect(next.frames?.[0].layers[0].name).toBe('Ghost');
    // The active stack is untouched.
    expect(next.layers).toBe(doc.layers);
  });

  it('removeLayerById reaches into non-active frames', () => {
    let doc = enableAnimation(createDocument({ width: 10, height: 10 }));
    const layerId = doc.layers[0].id;
    doc = { ...doc, frames: [...(doc.frames ?? []), blankFrame()] };
    doc = { ...doc, activeFrameId: doc.frames?.[1].id, layers: doc.frames?.[1].layers ?? [] };
    const next = removeLayerById(doc, layerId);
    expect(next.frames?.[0].layers).toHaveLength(0);
  });
});

describe('cloneFrame / blankFrame', () => {
  it('clones with fresh ids and equal content', () => {
    const frame = createFrame();
    const withOp = {
      ...frame,
      layers: [{ ...frame.layers[0], operations: [stroke('op-1')] }],
    };
    const clone = cloneFrame(withOp);
    expect(clone.id).not.toBe(withOp.id);
    expect(clone.layers[0].id).not.toBe(withOp.layers[0].id);
    expect(clone.layers[0].operations[0].id).not.toBe('op-1');
    expect(clone.layers[0].operations[0]).toMatchObject({ kind: 'stroke' });
  });

  it('copies presentation settings without sharing the metadata object', () => {
    const frame = {
      ...createFrame(),
      presentation: {
        transition: 'fade' as const,
        durationMs: 4000,
        notes: 'Pause here',
        caption: 'The story begins',
      },
    };
    const clone = cloneFrame(frame);
    expect(clone.presentation).toEqual(frame.presentation);
    expect(clone.presentation).not.toBe(frame.presentation);
  });

  it('a blank frame has one empty layer', () => {
    const frame = blankFrame();
    expect(frame.layers).toHaveLength(1);
    expect(frame.layers[0].operations).toHaveLength(0);
  });
});

describe('storyboard frame batch', () => {
  it('replaces a blank static canvas and restores it with one undo', () => {
    const history = new History();
    const doc = createDocument({ width: 10, height: 10 });
    const first = createFrame();
    const second = createFrame();
    const made = history.execute(doc, addStoryboardFramesCommand(doc, [first, second]));
    expect(made.frames).toEqual([first, second]);
    expect(made.activeFrameId).toBe(first.id);
    expect(made.layers).toBe(first.layers);

    const undone = history.undo(made);
    expect(undone.frames).toBeUndefined();
    expect(undone.layers).toBe(doc.layers);
    const redone = history.redo(undone);
    expect(redone.frames).toEqual([first, second]);
  });

  it('keeps existing static artwork as the first frame', () => {
    const history = new History();
    const doc = createDocument({ width: 10, height: 10 });
    const drawn = appendOperation(doc, doc.layers[0].id, stroke('original'));
    const scene = createFrame();
    const made = history.execute(drawn, addStoryboardFramesCommand(drawn, [scene]));
    expect(made.frames).toHaveLength(2);
    expect(made.frames?.[0].layers).toBe(drawn.layers);
    expect(made.frames?.[1]).toBe(scene);
    expect(history.undo(made).frames).toBeUndefined();
  });
});

describe('frame commands + history', () => {
  const animatedDoc = () => enableAnimation(createDocument({ width: 10, height: 10 }));

  it('addFrame inserts after the active frame and activates it; undo restores', () => {
    const history = new History();
    const doc = animatedDoc();
    const frame = blankFrame();
    const next = history.execute(doc, addFrameCommand(doc, frame));
    expect(next.frames).toHaveLength(2);
    expect(next.activeFrameId).toBe(frame.id);
    expect(next.layers).toBe(frame.layers);

    const undone = history.undo(next);
    expect(undone.frames).toHaveLength(1);
    expect(undone.activeFrameId).toBe(doc.activeFrameId);
    expect(undone.layers).toBe(doc.layers);
  });

  it('edits slide settings as one undoable command', () => {
    const history = new History();
    const doc = animatedDoc();
    const frameId = doc.activeFrameId ?? '';
    const edited = history.execute(
      doc,
      setFramePresentationCommand(doc, frameId, {
        transition: 'slide',
        durationMs: 6000,
        notes: 'Ask the room',
      }),
    );
    expect(edited.frames?.[0].presentation).toEqual({
      transition: 'slide',
      durationMs: 6000,
      notes: 'Ask the room',
    });
    expect(history.undo(edited).frames?.[0].presentation).toBeUndefined();
  });

  it('edits synchronized video captions together and preserves slide settings', () => {
    const history = new History();
    const first = animatedDoc();
    const second = blankFrame();
    const doc = history.execute(first, addFrameCommand(first, second));
    const withTiming = history.execute(
      doc,
      setFramePresentationCommand(doc, doc.frames![0].id, { durationMs: 3000 }),
    );
    const captions = withTiming.frames!.map((frame, index) => ({
      frameId: frame.id,
      caption: index === 0 ? 'First line' : 'Second line',
    }));
    const edited = history.execute(withTiming, setFrameCaptionsCommand(withTiming, captions));

    expect(edited.frames?.map((frame) => frame.presentation?.caption)).toEqual([
      'First line',
      'Second line',
    ]);
    expect(edited.frames?.[0].presentation?.durationMs).toBe(3000);
    const undone = history.undo(edited);
    expect(undone.frames?.map((frame) => frame.presentation?.caption)).toEqual([
      undefined,
      undefined,
    ]);
    expect(undone.frames?.[0].presentation?.durationMs).toBe(3000);
  });

  it('duplicateFrame clones the active frame with new ids', () => {
    const history = new History();
    const base = animatedDoc();
    const doc = appendOperation(base, base.layers[0].id, stroke('op-1'));
    const clone = cloneFrame(doc.frames![0]);
    const next = history.execute(doc, duplicateFrameCommand(doc, clone, doc.frames![0].id));
    expect(next.frames).toHaveLength(2);
    expect(next.activeFrameId).toBe(clone.id);
    expect(next.layers[0].operations).toHaveLength(1);
    expect(next.layers[0].operations[0].id).not.toBe('op-1');

    const undone = history.undo(next);
    expect(undone.frames).toHaveLength(1);
    expect(undone.activeFrameId).toBe(doc.activeFrameId);
  });

  it('removeFrame keeps at least one frame and falls back to a neighbour', () => {
    const history = new History();
    let doc = animatedDoc();
    const second = blankFrame();
    doc = history.execute(doc, addFrameCommand(doc, second));
    const firstId = doc.frames![0].id;

    const removed = history.execute(doc, removeFrameCommand(doc, second.id));
    expect(removed.frames).toHaveLength(1);
    expect(removed.activeFrameId).toBe(firstId);

    // Last frame cannot be removed.
    const refused = removeFrameCommand(removed, firstId).apply(removed);
    expect(refused.frames).toHaveLength(1);

    const restored = history.undo(removed);
    expect(restored.frames).toHaveLength(2);
    expect(restored.activeFrameId).toBe(second.id);
  });

  it('moveFrame reorders and undo moves back', () => {
    const history = new History();
    let doc = animatedDoc();
    const b = blankFrame();
    const c = blankFrame();
    doc = history.execute(doc, addFrameCommand(doc, b));
    doc = history.execute(doc, addFrameCommand(doc, c));
    const firstId = doc.frames![0].id;

    const moved = history.execute(doc, moveFrameCommand(doc, firstId, 2));
    expect(moved.frames?.map((f) => f.id)).toEqual([b.id, c.id, firstId]);
    // Active frame (and its mirrored stack) survive a reorder.
    expect(moved.activeFrameId).toBe(c.id);

    const undone = history.undo(moved);
    expect(undone.frames?.map((f) => f.id)).toEqual([firstId, b.id, c.id]);
  });

  it('setAnimationEnabledCommand round-trips through undo/redo', () => {
    const history = new History();
    const doc = createDocument({ width: 10, height: 10 });
    const animated = history.execute(doc, setAnimationEnabledCommand(doc, true));
    expect(isAnimated(animated)).toBe(true);

    const disabled = history.execute(animated, setAnimationEnabledCommand(animated, false));
    expect(isAnimated(disabled)).toBe(false);

    const backOn = history.undo(disabled);
    expect(isAnimated(backOn)).toBe(true);
    expect(backOn.activeFrameId).toBe(animated.activeFrameId);

    const backOff = history.undo(backOn);
    expect(isAnimated(backOff)).toBe(false);

    const redone = history.redo(backOff);
    expect(isAnimated(redone)).toBe(true);
  });

  it('content undo still works after switching frames (frame-aware layers)', () => {
    const history = new History();
    let doc = animatedDoc();
    const layerId = doc.layers[0].id;
    doc = history.execute(doc, addOperationCommand(layerId, stroke('op-1')));
    expect(doc.frames![0].layers[0].operations).toHaveLength(1);

    // Switch to a second frame, then undo: the op leaves frame 1.
    const second = blankFrame();
    doc = {
      ...doc,
      frames: [...doc.frames!, second],
      activeFrameId: second.id,
      layers: second.layers,
    };
    const undone = history.undo(doc);
    expect(undone.frames![0].layers[0].operations).toHaveLength(0);
    // The active (second) frame is untouched.
    expect(undone.layers).toBe(doc.layers);
  });
});

describe('playback timing', () => {
  it('maps elapsed time to frame indices at the given fps', () => {
    // 6 fps → a new frame every ~166.7ms.
    expect(frameIndexAtTime(0, 6, 12, true).index).toBe(0);
    expect(frameIndexAtTime(166, 6, 12, true).index).toBe(0);
    expect(frameIndexAtTime(167, 6, 12, true).index).toBe(1);
    expect(frameIndexAtTime(1000, 6, 12, true).index).toBe(6);
  });

  it('loops by wrapping around the frame count', () => {
    expect(frameIndexAtTime(2000, 6, 12, true)).toEqual({ index: 0, done: false });
    expect(frameIndexAtTime(2500, 6, 12, true).index).toBe(3);
  });

  it('non-looping clamps to the last frame and reports done', () => {
    expect(frameIndexAtTime(1999, 6, 12, false)).toEqual({ index: 11, done: false });
    expect(frameIndexAtTime(2000, 6, 12, false)).toEqual({ index: 11, done: true });
  });

  it('clamps out-of-range fps and handles degenerate inputs', () => {
    expect(frameIndexAtTime(1000, 0.1, 4, true).index).toBe(1); // fps clamped to 1
    expect(frameIndexAtTime(1000, 999, 4, true).index).toBe(0); // fps clamped to 24
    expect(frameIndexAtTime(100, 6, 0, true)).toEqual({ index: -1, done: true });
  });

  it('computes the total duration', () => {
    expect(animationDurationMs(12, 6)).toBe(2000);
    expect(animationDurationMs(0, 6)).toBe(0);
  });
});

describe('onion skinning', () => {
  const docWith = (patch: Partial<typeof DEFAULT_ANIMATION_SETTINGS>) => {
    let doc = enableAnimation(createDocument({ width: 10, height: 10 }));
    const b = blankFrame();
    const c = blankFrame();
    doc = { ...doc, frames: [...doc.frames!, b, c] };
    doc = { ...doc, activeFrameId: b.id, layers: b.layers }; // middle frame active
    doc = { ...doc, animation: { ...animationSettingsOf(doc), ...patch } };
    return doc;
  };

  it('is empty when the setting is off or animation is off', () => {
    expect(onionSkinTargets(docWith({ onionSkin: false }))).toEqual([]);
    expect(onionSkinTargets(createDocument({ width: 10, height: 10 }))).toEqual([]);
  });

  it('ghosts the previous frame at the configured opacity', () => {
    const targets = onionSkinTargets(docWith({ onionSkin: true, onionOpacity: 0.5 }));
    expect(targets).toHaveLength(1);
    expect(targets[0].opacity).toBe(0.5);
  });

  it('optionally ghosts the next frame too', () => {
    const doc = docWith({ onionSkin: true, onionNext: true });
    const targets = onionSkinTargets(doc);
    expect(targets).toHaveLength(2);
    expect(targets[0].frame.id).toBe(doc.frames![0].id);
    expect(targets[1].frame.id).toBe(doc.frames![2].id);
  });

  it('first frame has no previous ghost', () => {
    const doc = docWith({ onionSkin: true });
    const first = { ...doc, activeFrameId: doc.frames![0].id, layers: doc.frames![0].layers };
    expect(onionSkinTargets(first)).toEqual([]);
  });
});

describe('sprite sheet layout', () => {
  it('packs frames into a near-square grid capped at 8 columns', () => {
    const layout = spriteSheetLayout(12, 100, 50);
    expect(layout.columns).toBe(4);
    expect(layout.rows).toBe(3);
    expect(layout.width).toBe(400);
    expect(layout.height).toBe(150);
    expect(layout.positions).toHaveLength(12);
    expect(layout.positions[0]).toEqual({ x: 0, y: 0 });
    expect(layout.positions[4]).toEqual({ x: 0, y: 50 });
    expect(layout.positions[11]).toEqual({ x: 300, y: 100 });
  });

  it('single row for few frames; single column never exceeds count', () => {
    expect(spriteSheetLayout(3, 10, 10).columns).toBe(2);
    expect(spriteSheetLayout(1, 10, 10).columns).toBe(1);
    expect(spriteSheetLayout(20, 10, 10).columns).toBe(5);
    expect(spriteSheetLayout(64, 10, 10).columns).toBe(8); // max columns cap
  });
});

describe('presentationFrames', () => {
  it('falls back to a single implicit slide for plain documents', () => {
    const doc = createDocument({ width: 10, height: 10 });
    expect(presentationFrames(doc)).toEqual([{ layers: doc.layers }]);
  });

  it('uses the real frames when animated', () => {
    const doc = enableAnimation(createDocument({ width: 10, height: 10 }));
    expect(presentationFrames(doc)).toBe(doc.frames);
    expect(activeFrameIndex(doc)).toBe(0);
  });
});

describe('slideDurationMs', () => {
  it('converts seconds and clamps invalid editor input to 1..60 seconds', () => {
    expect(slideDurationMs(7)).toBe(7000);
    expect(slideDurationMs(0)).toBe(1000);
    expect(slideDurationMs(99)).toBe(60000);
    expect(slideDurationMs(Number.NaN)).toBe(5000);
  });
});
