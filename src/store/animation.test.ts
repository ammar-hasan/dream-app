import { beforeEach, describe, expect, it } from 'vitest';
import { useDreamStore } from './dreamStore';

const store = () => useDreamStore.getState();

beforeEach(() => {
  store().newDocument({ width: 100, height: 80, name: 'Test' });
});

const drawStroke = () => {
  store().setTool('brush');
  store().pointerDown({ x: 1, y: 1 });
  store().pointerUp({ x: 5, y: 5 });
};

describe('animation toggle', () => {
  it('wraps the current layers in frame 1 and back', () => {
    drawStroke();
    store().toggleAnimation();
    const s = store();
    expect(s.doc.frames).toHaveLength(1);
    expect(s.doc.frames?.[0].layers).toBe(s.doc.layers);
    expect(s.doc.layers[0].operations).toHaveLength(1);
    expect(s.canUndo).toBe(true);

    store().toggleAnimation();
    expect(store().doc.frames).toBeUndefined();
    expect(store().doc.layers[0].operations).toHaveLength(1);
  });

  it('is undoable', () => {
    store().toggleAnimation();
    store().undo();
    expect(store().doc.frames).toBeUndefined();
    store().redo();
    expect(store().doc.frames).toHaveLength(1);
  });
});

describe('frame CRUD', () => {
  beforeEach(() => store().toggleAnimation());

  it('addFrame appends a blank frame, activates it and is undoable', () => {
    drawStroke(); // stroke lands on frame 1
    store().addFrame();
    const s = store();
    expect(s.doc.frames).toHaveLength(2);
    expect(s.doc.activeFrameId).toBe(s.doc.frames?.[1].id);
    expect(s.doc.layers).toHaveLength(1);
    expect(s.doc.layers[0].operations).toHaveLength(0); // blank page
    expect(s.activeLayerId).toBe(s.doc.layers[0].id);

    store().undo();
    expect(store().doc.frames).toHaveLength(1);
    expect(store().doc.layers[0].operations).toHaveLength(1); // frame 1's stack
  });

  it('duplicateFrame clones content with fresh ids', () => {
    drawStroke();
    store().duplicateFrame();
    const s = store();
    expect(s.doc.frames).toHaveLength(2);
    expect(s.doc.activeFrameId).toBe(s.doc.frames?.[1].id);
    expect(s.doc.layers[0].operations).toHaveLength(1);
    expect(s.doc.layers[0].id).not.toBe(s.doc.frames?.[0].layers[0].id);
  });

  it('deleteFrame removes the active frame but never the last one', () => {
    store().addFrame();
    store().deleteFrame(store().doc.activeFrameId ?? '');
    expect(store().doc.frames).toHaveLength(1);
    store().deleteFrame(store().doc.activeFrameId ?? '');
    expect(store().doc.frames).toHaveLength(1);
    store().undo();
    expect(store().doc.frames).toHaveLength(2);
  });

  it('moveFrame reorders and undo restores', () => {
    store().addFrame();
    store().addFrame();
    const firstId = store().doc.frames?.[0].id ?? '';
    store().moveFrame(firstId, 2);
    expect(store().doc.frames?.[2].id).toBe(firstId);
    store().undo();
    expect(store().doc.frames?.[0].id).toBe(firstId);
  });

  it('saves slide settings, copies them on duplicate, and undoes the edit', () => {
    const firstId = store().doc.activeFrameId ?? '';
    store().setFramePresentation(firstId, {
      transition: 'fade',
      durationMs: 5000,
      notes: 'Introduce the idea',
    });
    expect(store().doc.frames?.[0].presentation?.notes).toBe('Introduce the idea');
    store().undo();
    expect(store().doc.frames?.[0].presentation).toBeUndefined();
    store().redo();
    store().duplicateFrame();
    expect(store().doc.frames?.[1].presentation).toEqual(store().doc.frames?.[0].presentation);
    expect(store().doc.frames?.[1].presentation).not.toBe(store().doc.frames?.[0].presentation);
  });

  it('does not add history for unchanged slide settings', () => {
    const firstId = store().doc.activeFrameId ?? '';
    store().setFramePresentation(firstId, undefined);
    store().undo();
    expect(store().doc.frames).toBeUndefined();
  });

  it('saves every video caption as one undoable edit', () => {
    store().addFrame();
    store().setFrameCaptions(['  First message  ', 'Second message']);
    expect(store().doc.frames?.map((frame) => frame.presentation?.caption)).toEqual([
      'First message',
      'Second message',
    ]);
    store().undo();
    expect(store().doc.frames?.map((frame) => frame.presentation?.caption)).toEqual([
      undefined,
      undefined,
    ]);
    store().redo();
    expect(store().doc.frames?.[1].presentation?.caption).toBe('Second message');
  });
});

describe('frame switching + drawing', () => {
  it('each frame keeps its own layer stack; doc.layers mirrors the active one', () => {
    store().toggleAnimation();
    drawStroke();
    store().addFrame();
    expect(store().doc.layers[0].operations).toHaveLength(0);

    const firstId = store().doc.frames?.[0].id ?? '';
    store().selectFrame(firstId);
    expect(store().doc.layers[0].operations).toHaveLength(1);
    expect(store().doc.activeFrameId).toBe(firstId);
  });

  it('selectFrame is not undoable and clears drafts/selection', () => {
    store().toggleAnimation();
    drawStroke();
    store().addFrame();
    const undoDepth = store().canUndo;
    store().selectFrame(store().doc.frames?.[0].id ?? '');
    expect(store().canUndo).toBe(undoDepth); // no history entry added
    store().undo(); // undoes the frame ADD, not the switch
    expect(store().doc.frames).toHaveLength(1);
  });

  it('drawing on frame 2 writes to frame 2 only', () => {
    store().toggleAnimation();
    store().addFrame();
    drawStroke();
    const s = store();
    expect(s.doc.frames?.[0].layers[0].operations).toHaveLength(0);
    expect(s.doc.frames?.[1].layers[0].operations).toHaveLength(1);
  });

  it('undo after switching frames removes the stroke from its own frame', () => {
    store().toggleAnimation();
    store().addFrame(); // frame 2, now active
    store().selectFrame(store().doc.frames?.[0].id ?? '');
    drawStroke(); // stroke on frame 1
    store().selectFrame(store().doc.frames?.[1].id ?? '');
    store().undo(); // undoes the stroke, even though frame 2 is active
    expect(store().doc.frames?.[0].layers[0].operations).toHaveLength(0);
    expect(store().doc.layers).toBe(store().doc.frames?.[1].layers);
  });
});

describe('animation settings', () => {
  it('fps is clamped to 1..24 and settings persist on the doc', () => {
    store().toggleAnimation();
    store().setAnimation({ fps: 60 });
    expect(store().doc.animation?.fps).toBe(24);
    store().setAnimation({ fps: 0 });
    expect(store().doc.animation?.fps).toBe(1);
    store().setAnimation({ fps: 12, loop: false, onionSkin: true, onionOpacity: 2 });
    const settings = store().doc.animation;
    expect(settings).toMatchObject({ fps: 12, loop: false, onionSkin: true, onionOpacity: 1 });
  });

  it('settings changes are not undoable', () => {
    store().toggleAnimation();
    store().setAnimation({ fps: 12 });
    store().undo(); // undoes the animation toggle, not the fps change
    expect(store().doc.frames).toBeUndefined();
  });
});

describe('playback state', () => {
  it('play requires frames; pause resets the playback frame', () => {
    store().play();
    expect(store().playing).toBe(false); // no animation yet

    store().toggleAnimation();
    store().addFrame();
    store().play();
    expect(store().playing).toBe(true);
    expect(store().playbackFrame).toBe(1); // starts on the active frame

    store().setPlaybackFrame(0);
    expect(store().playbackFrame).toBe(0);

    store().pause();
    expect(store().playing).toBe(false);
    expect(store().playbackFrame).toBeNull();
  });

  it('editing gestures are ignored while playing', () => {
    store().toggleAnimation();
    store().play();
    drawStroke();
    expect(store().doc.layers[0].operations).toHaveLength(0);
    store().pause();
  });

  it('togglePlay flips state; undo pauses playback', () => {
    store().toggleAnimation();
    store().togglePlay();
    expect(store().playing).toBe(true);
    store().undo();
    expect(store().playing).toBe(false);
  });
});

describe('present mode', () => {
  it('entering present starts on the active frame; Esc-path returns to last edit mode', () => {
    store().setMode('design');
    store().toggleAnimation();
    store().addFrame(); // active = frame 2
    store().setMode('present');
    const s = store();
    expect(s.mode).toBe('present');
    expect(s.presentIndex).toBe(1);
    expect(s.lastEditMode).toBe('design');

    store().presentNext(); // clamped at the last slide
    expect(store().presentIndex).toBe(1);
    store().presentPrev();
    expect(store().presentIndex).toBe(0);
    store().presentPrev();
    expect(store().presentIndex).toBe(0);

    store().setMode(store().lastEditMode);
    expect(store().mode).toBe('design');
  });

  it('a document without frames presents as a one-slide deck', () => {
    store().setMode('present');
    expect(store().presentIndex).toBe(0);
    store().presentNext();
    expect(store().presentIndex).toBe(0);
  });

  it('present is session-only: loading a doc saved mid-presentation starts in draw', () => {
    store().toggleAnimation();
    store().setMode('present');
    const saved = store().doc;
    expect(saved.mode).toBe('present');
    store().loadDocument(saved);
    expect(store().mode).toBe('draw');
    expect(store().doc.mode).toBe('draw');
  });

  it('loading an old save (no mode, no frames) still works', () => {
    const legacy = store().doc;
    delete legacy.mode; // simulate a slice-1-era save
    store().loadDocument(legacy);
    expect(store().mode).toBe('draw');
    expect(store().doc.frames).toBeUndefined();
  });
});
