/**
 * Stamps & starter scenes: op counts, determinism (same inputs → same
 * drawing, modulo generated ids) and bounds (stamps stay in their box,
 * scenes stay on the canvas).
 */

import { describe, expect, it } from 'vitest';
import { createStamp, STAMP_IDS, STAMP_SIZES, type StampId } from './stamps';
import { createStarterScene, SCENE_IDS, type SceneId } from './starterScenes';
import { selectionBounds, unionBounds } from './selection';
import type { Operation, Rect } from './types';

/** Strip per-call generated ids so two calls can be deep-compared. */
function comparable(ops: Operation[]): unknown {
  return ops.map(({ id: _id, groupId: _groupId, ...rest }) => rest);
}

function boundsOf(ops: Operation[]): Rect {
  const bounds = unionBounds(ops.map(selectionBounds));
  if (!bounds) throw new Error('expected ops');
  return bounds;
}

describe('createStamp', () => {
  it('builds every stamp with a healthy op count', () => {
    for (const id of STAMP_IDS) {
      const ops = createStamp(id, { x: 100, y: 100 }, STAMP_SIZES.medium);
      expect(ops.length, id).toBeGreaterThanOrEqual(4);
      expect(ops.length, id).toBeLessThanOrEqual(24);
    }
  });

  it('is deterministic — same stamp, same size, same ops', () => {
    for (const id of STAMP_IDS) {
      const a = createStamp(id, { x: 50, y: 60 }, 96);
      const b = createStamp(id, { x: 50, y: 60 }, 96);
      expect(comparable(a), id).toEqual(comparable(b));
    }
  });

  it('stays inside the size box around the center (plus stroke padding)', () => {
    const center = { x: 300, y: 200 };
    for (const id of STAMP_IDS) {
      const size = STAMP_SIZES.medium;
      const bounds = boundsOf(createStamp(id, center, size));
      // Stroke caps can overshoot the nominal box a little; allow 20%.
      const pad = size * 0.2;
      expect(bounds.x, id).toBeGreaterThanOrEqual(center.x - size / 2 - pad);
      expect(bounds.y, id).toBeGreaterThanOrEqual(center.y - size / 2 - pad);
      expect(bounds.x + bounds.width, id).toBeLessThanOrEqual(center.x + size / 2 + pad);
      expect(bounds.y + bounds.height, id).toBeLessThanOrEqual(center.y + size / 2 + pad);
    }
  });

  it('follows the placement point', () => {
    const ops = createStamp('smiley', { x: 500, y: 400 }, 96);
    const bounds = boundsOf(ops);
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    expect(Math.abs(cx - 500)).toBeLessThan(20);
    expect(Math.abs(cy - 400)).toBeLessThan(20);
  });

  it('shares one groupId across all ops of a stamp', () => {
    const ops = createStamp('cat', { x: 0, y: 0 }, 96);
    const groups = new Set(ops.map((op) => op.groupId));
    expect(groups.size).toBe(1);
    expect(ops[0].groupId).toBeTruthy();
  });

  it('scales with the requested size', () => {
    const small = boundsOf(createStamp('rocket' as StampId, { x: 0, y: 0 }, STAMP_SIZES.small));
    const large = boundsOf(createStamp('rocket', { x: 0, y: 0 }, STAMP_SIZES.large));
    expect(large.width).toBeGreaterThan(small.width * 2);
  });
});

describe('createStarterScene', () => {
  const W = 1024;
  const H = 768;

  it('builds every scene with a healthy op count', () => {
    for (const id of SCENE_IDS) {
      const ops = createStarterScene(id, W, H);
      expect(ops.length, id).toBeGreaterThanOrEqual(15);
    }
  });

  it('is deterministic for the same document size', () => {
    for (const id of SCENE_IDS) {
      expect(comparable(createStarterScene(id, W, H)), id).toEqual(
        comparable(createStarterScene(id, W, H)),
      );
    }
  });

  it('adapts to the document size (no fixed canvas assumptions)', () => {
    for (const id of SCENE_IDS) {
      const a = comparable(createStarterScene(id, W, H));
      const b = comparable(createStarterScene(id, 400, 300));
      expect(a, id).not.toEqual(b);
    }
  });

  it('keeps all outline ops on the canvas (small stroke-width margin)', () => {
    for (const id of SCENE_IDS) {
      const bounds = boundsOf(createStarterScene(id, W, H));
      expect(bounds.x, id).toBeGreaterThanOrEqual(-6);
      expect(bounds.y, id).toBeGreaterThanOrEqual(-6);
      expect(bounds.x + bounds.width, id).toBeLessThanOrEqual(W + 6);
      expect(bounds.y + bounds.height, id).toBeLessThanOrEqual(H + 6);
    }
  });

  it('draws outlines only — a coloring book, nothing pre-filled', () => {
    for (const id of SCENE_IDS as readonly SceneId[]) {
      for (const op of createStarterScene(id, W, H)) {
        if (op.kind === 'shape') expect(op.fill, id).toBeFalsy();
        expect(op.color, id).toBe('#1f2937');
      }
    }
  });
});
