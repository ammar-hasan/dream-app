import { beforeEach, describe, expect, it } from 'vitest';
import { enableAnimation, blankFrame } from './animation';
import { createDocument } from './document';
import {
  History,
  addFrameCommand,
  addHotspotCommand,
  removeFrameCommand,
  removeHotspotCommand,
  updateHotspotCommand,
} from './history';
import {
  activeHotspots,
  createHotspot,
  frameHotspots,
  hasHotspots,
  hotspotAt,
  hotspotTargetIndex,
  isHotspotBroken,
} from './hotspots';
import type { DreamDocument } from './types';

let doc: DreamDocument;
let history: History;

beforeEach(() => {
  history = new History();
  doc = enableAnimation(createDocument({ width: 100, height: 80, name: 'App' }));
  doc = history.execute(doc, addFrameCommand(doc, blankFrame()));
});

const frameIds = () => (doc.frames ?? []).map((f) => f.id);
const firstFrame = () => frameIds()[0];

describe('hotspot commands', () => {
  it('addHotspot is undoable and redoable', () => {
    const hotspot = createHotspot({ x: 10, y: 10, width: 20, height: 12 }, frameIds()[1]);
    doc = history.execute(doc, addHotspotCommand(firstFrame(), hotspot));
    expect(frameHotspots(doc, firstFrame())).toEqual([hotspot]);
    expect(hasHotspots(doc)).toBe(true);

    doc = history.undo(doc);
    expect(frameHotspots(doc, firstFrame())).toEqual([]);
    expect(hasHotspots(doc)).toBe(false);

    doc = history.redo(doc);
    expect(frameHotspots(doc, firstFrame())).toEqual([hotspot]);
  });

  it('removeHotspot restores the hotspot at its position on undo', () => {
    const a = createHotspot({ x: 0, y: 0, width: 10, height: 10 }, frameIds()[1]);
    const b = createHotspot({ x: 20, y: 20, width: 10, height: 10 }, frameIds()[1]);
    doc = history.execute(doc, addHotspotCommand(firstFrame(), a));
    doc = history.execute(doc, addHotspotCommand(firstFrame(), b));
    doc = history.execute(doc, removeHotspotCommand(doc, firstFrame(), a.id));
    expect(frameHotspots(doc, firstFrame())).toEqual([b]);

    doc = history.undo(doc);
    expect(frameHotspots(doc, firstFrame())).toEqual([a, b]);
  });

  it('updateHotspot patches target/transition and revert restores them', () => {
    const hotspot = createHotspot({ x: 0, y: 0, width: 10, height: 10 }, frameIds()[0], 'none');
    doc = history.execute(doc, addHotspotCommand(firstFrame(), hotspot));
    doc = history.execute(
      doc,
      updateHotspotCommand(doc, firstFrame(), hotspot.id, {
        targetFrameId: frameIds()[1],
        transition: 'slide',
      }),
    );
    const updated = frameHotspots(doc, firstFrame())[0];
    expect(updated.targetFrameId).toBe(frameIds()[1]);
    expect(updated.transition).toBe('slide');

    doc = history.undo(doc);
    const restored = frameHotspots(doc, firstFrame())[0];
    expect(restored.targetFrameId).toBe(frameIds()[0]);
    expect(restored.transition).toBe('none');
  });

  it('hotspots survive a duplicate-frame-free document edit untouched', () => {
    const hotspot = createHotspot({ x: 5, y: 5, width: 10, height: 10 }, frameIds()[1]);
    doc = history.execute(doc, addHotspotCommand(firstFrame(), hotspot));
    // Editing an unrelated frame must not disturb the first frame's hotspots.
    doc = history.execute(doc, addHotspotCommand(frameIds()[1], hotspot));
    expect(frameHotspots(doc, firstFrame())).toEqual([hotspot]);
  });
});

describe('broken targets', () => {
  it('a hotspot whose target frame is deleted is broken; undo heals it', () => {
    const hotspot = createHotspot({ x: 0, y: 0, width: 10, height: 10 }, frameIds()[1]);
    doc = history.execute(doc, addHotspotCommand(firstFrame(), hotspot));
    expect(isHotspotBroken(doc, hotspot)).toBe(false);
    expect(hotspotTargetIndex(doc, hotspot)).toBe(1);

    doc = history.execute(doc, removeFrameCommand(doc, frameIds()[1]));
    expect(isHotspotBroken(doc, hotspot)).toBe(true);
    expect(hotspotTargetIndex(doc, hotspot)).toBe(-1);
    // The hotspot itself stays on its own frame — flagged, not destroyed.
    expect(frameHotspots(doc, firstFrame())).toEqual([hotspot]);

    doc = history.undo(doc);
    expect(isHotspotBroken(doc, hotspot)).toBe(false);
  });
});

describe('queries', () => {
  it('activeHotspots follows the active frame', () => {
    const hotspot = createHotspot({ x: 0, y: 0, width: 10, height: 10 }, frameIds()[0]);
    doc = history.execute(doc, addHotspotCommand(frameIds()[1], hotspot));
    // addFrame made frame 2 active; its hotspots are the active ones.
    expect(activeHotspots(doc)).toEqual([hotspot]);
  });

  it('hotspotAt hit-tests the rect, edges included', () => {
    const hotspot = createHotspot({ x: 10, y: 10, width: 20, height: 10 }, frameIds()[0]);
    doc = history.execute(doc, addHotspotCommand(doc.activeFrameId ?? '', hotspot));
    const frame = doc.frames?.find((f) => f.id === doc.activeFrameId);
    expect(frame && hotspotAt(frame, { x: 15, y: 15 })?.id).toBe(hotspot.id);
    expect(frame && hotspotAt(frame, { x: 30, y: 20 })?.id).toBe(hotspot.id);
    expect(frame && hotspotAt(frame, { x: 31, y: 15 })).toBeUndefined();
  });
});
