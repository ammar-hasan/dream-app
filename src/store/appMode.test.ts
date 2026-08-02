import { beforeEach, describe, expect, it } from 'vitest';
import { activeHotspots, hasHotspots, isHotspotBroken } from '../engine/hotspots';
import { useDreamStore } from './dreamStore';

const store = () => useDreamStore.getState();

beforeEach(() => {
  store().newDocument({ width: 100, height: 80, name: 'Test' });
  store().toggleAnimation();
  store().addFrame();
  store().setMode('design');
  store().setTool('link');
});

const frameIds = () => (store().doc.frames ?? []).map((f) => f.id);

/** Drag a link rect on the canvas with the Link tool. */
const dragLink = (from = { x: 10, y: 10 }, to = { x: 40, y: 30 }) => {
  store().pointerDown(from);
  store().pointerMove({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });
  store().pointerUp(to);
};

describe('link tool gesture', () => {
  it('dragging a rect opens the pending-hotspot dialog state', () => {
    dragLink();
    expect(store().linkDraft).toBeNull();
    expect(store().pendingHotspot).toEqual({ x: 10, y: 10, width: 30, height: 20 });
  });

  it('tiny drags are slips, not links', () => {
    dragLink({ x: 10, y: 10 }, { x: 11, y: 11 });
    expect(store().pendingHotspot).toBeNull();
  });

  it('is ignored when the document has no frames', () => {
    store().newDocument({ width: 100, height: 80 });
    store().setMode('design');
    store().setTool('link');
    dragLink();
    expect(store().pendingHotspot).toBeNull();
    expect(store().linkDraft).toBeNull();
  });
});

describe('hotspot actions', () => {
  it('addHotspot commits an undoable link on the active frame', () => {
    dragLink();
    store().addHotspot(frameIds()[0], 'fade');
    expect(store().pendingHotspot).toBeNull();
    const hotspots = activeHotspots(store().doc);
    expect(hotspots).toHaveLength(1);
    expect(hotspots[0].targetFrameId).toBe(frameIds()[0]);
    expect(hotspots[0].transition).toBe('fade');
    expect(hasHotspots(store().doc)).toBe(true);

    store().undo();
    expect(activeHotspots(store().doc)).toHaveLength(0);
    store().redo();
    expect(activeHotspots(store().doc)).toHaveLength(1);
  });

  it('cancelHotspot discards the pending rect', () => {
    dragLink();
    store().cancelHotspot();
    expect(store().pendingHotspot).toBeNull();
    expect(activeHotspots(store().doc)).toHaveLength(0);
  });

  it('addHotspot rejects a target that is not a frame', () => {
    dragLink();
    store().addHotspot('nope', 'none');
    expect(activeHotspots(store().doc)).toHaveLength(0);
  });

  it('removeHotspot and updateHotspot are undoable', () => {
    dragLink();
    store().addHotspot(frameIds()[0], 'none');
    const id = activeHotspots(store().doc)[0].id;

    store().updateHotspot(id, { targetFrameId: frameIds()[1], transition: 'slide' });
    expect(activeHotspots(store().doc)[0].targetFrameId).toBe(frameIds()[1]);
    expect(activeHotspots(store().doc)[0].transition).toBe('slide');
    store().undo();
    expect(activeHotspots(store().doc)[0].targetFrameId).toBe(frameIds()[0]);

    store().removeHotspot(id);
    expect(activeHotspots(store().doc)).toHaveLength(0);
    store().undo();
    expect(activeHotspots(store().doc)).toHaveLength(1);
  });

  it('deleting the target frame breaks the hotspot gracefully (and undo heals)', () => {
    // Link frame 2 (active) back to frame 1, then delete frame 1.
    dragLink();
    store().addHotspot(frameIds()[0], 'fade');
    const hotspot = activeHotspots(store().doc)[0];
    store().deleteFrame(frameIds()[0]);

    const broken = activeHotspots(store().doc)[0];
    expect(broken.id).toBe(hotspot.id);
    expect(isHotspotBroken(store().doc, broken)).toBe(true);

    store().undo();
    expect(isHotspotBroken(store().doc, activeHotspots(store().doc)[0])).toBe(false);
  });
});

describe('app preview state', () => {
  it('previewApp opens Present mode as an app on the active frame', () => {
    store().previewApp();
    expect(store().mode).toBe('present');
    expect(store().presentStyle).toBe('app');
    expect(store().presentIndex).toBe(1); // frame 2 is active
    expect(store().presentStart).toBe(1);
  });

  it('entering Present directly resets to a slideshow', () => {
    store().setPresentStyle('app');
    store().setMode('present');
    expect(store().presentStyle).toBe('slides');
  });

  it('presentGoTo clamps to the deck and presentRestart returns to start', () => {
    store().previewApp();
    store().presentGoTo(0);
    expect(store().presentIndex).toBe(0);
    store().presentGoTo(99);
    expect(store().presentIndex).toBe(1);
    store().presentGoTo(0);
    store().presentRestart();
    expect(store().presentIndex).toBe(1);
  });
});
