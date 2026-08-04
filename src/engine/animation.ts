/**
 * Animation domain: frame model helpers, playback timing, onion skinning and
 * sprite-sheet layout. Pure TypeScript — no DOM, fully unit-testable.
 *
 * Model (see types.ts): a document optionally has `frames`; each frame owns
 * its own layer stack and `doc.layers` mirrors the ACTIVE frame's stack, so
 * the renderer, tools and persistence never needed to learn about frames.
 * A presentation is the same model stepped through manually — no frames just
 * means a one-slide deck.
 */

import { createFrame, createLayer, genId } from './document';
import { clamp } from './geometry';
import type { AnimationSettings, DreamDocument, Frame, Layer, Point } from './types';

export const MIN_FPS = 1;
export const MAX_FPS = 24;
export const DEFAULT_FPS = 6;
export const DEFAULT_ONION_OPACITY = 0.3;
/** Short enough to remain legible when burned into a social-video frame. */
export const MAX_FRAME_CAPTION_LENGTH = 160;

export const DEFAULT_ANIMATION_SETTINGS: AnimationSettings = {
  fps: DEFAULT_FPS,
  loop: true,
  onionSkin: false,
  onionNext: false,
  onionOpacity: DEFAULT_ONION_OPACITY,
};

/** Settings with defaults filled in for old saves / fresh documents. */
export function animationSettingsOf(doc: DreamDocument): AnimationSettings {
  return { ...DEFAULT_ANIMATION_SETTINGS, ...doc.animation };
}

/** True when the document has an animation (even a single frame). */
export function isAnimated(doc: DreamDocument): boolean {
  return doc.frames !== undefined;
}

/** Index of the active frame in play order (-1 when animation is off). */
export function activeFrameIndex(doc: DreamDocument): number {
  if (!doc.frames) return -1;
  const index = doc.frames.findIndex((f) => f.id === doc.activeFrameId);
  return index === -1 ? 0 : index;
}

/**
 * Turn animation on: the current layer stack becomes frame 1.
 * Inverse of `disableAnimation`; both are wrapped in undoable commands.
 */
export function enableAnimation(doc: DreamDocument): DreamDocument {
  if (doc.frames) return doc;
  const frame = createFrame(doc.layers);
  return { ...doc, frames: [frame], activeFrameId: frame.id, updatedAt: Date.now() };
}

/**
 * Turn animation off: the ACTIVE frame's stack survives, other frames are
 * dropped (undoable via the command in history.ts).
 */
export function disableAnimation(doc: DreamDocument): DreamDocument {
  if (!doc.frames) return doc;
  const next = { ...doc, updatedAt: Date.now() };
  delete next.frames;
  delete next.activeFrameId;
  return next;
}

/** Deep-clone a frame with fresh frame/layer/op ids (for Duplicate frame). */
export function cloneFrame(frame: Frame): Frame {
  const cloneOp = <T extends { id: string }>(op: T): T => ({ ...op, id: genId('op') });
  return {
    id: genId('frame'),
    ...(frame.presentation ? { presentation: { ...frame.presentation } } : {}),
    layers: frame.layers.map((layer) => ({
      ...layer,
      id: genId('layer'),
      operations: layer.operations.map(cloneOp),
      ...(layer.mask
        ? {
            mask: {
              ...layer.mask,
              strokes: layer.mask.strokes.map((stroke) => cloneOp(stroke)),
            },
          }
        : {}),
    })),
  };
}

export const MIN_SLIDE_DURATION_SECONDS = 1;
export const MAX_SLIDE_DURATION_SECONDS = 60;
export const DEFAULT_SLIDE_DURATION_SECONDS = 5;

/** Clamp editor input to the persisted per-slide timing contract. */
export function slideDurationMs(seconds: number): number {
  const finite = Number.isFinite(seconds) ? seconds : DEFAULT_SLIDE_DURATION_SECONDS;
  return Math.max(MIN_SLIDE_DURATION_SECONDS, Math.min(MAX_SLIDE_DURATION_SECONDS, finite)) * 1000;
}

/** A fresh frame with one empty layer (flipbook "blank page"). */
export function blankFrame(): Frame {
  return createFrame([createLayer('Layer 1')]);
}

// ---------------------------------------------------------------------------
// Playback timing (pure; the rAF driver in the UI is a thin wrapper).
// ---------------------------------------------------------------------------

/** Total duration of the animation in milliseconds. */
export function animationDurationMs(frameCount: number, fps: number): number {
  if (frameCount < 1 || fps < 1) return 0;
  return (frameCount * 1000) / fps;
}

/**
 * Which frame is showing `elapsedMs` into playback.
 * Looping wraps; non-looping clamps to the last frame (and `done` reports
 * whether playback has run past the end, so the driver can stop).
 */
export function frameIndexAtTime(
  elapsedMs: number,
  fps: number,
  frameCount: number,
  loop: boolean,
): { index: number; done: boolean } {
  if (frameCount < 1) return { index: -1, done: true };
  const safeFps = clamp(fps, MIN_FPS, MAX_FPS);
  const frame = Math.floor((Math.max(0, elapsedMs) / 1000) * safeFps);
  if (loop) return { index: frame % frameCount, done: false };
  return { index: Math.min(frame, frameCount - 1), done: frame >= frameCount };
}

// ---------------------------------------------------------------------------
// Onion skinning: decide WHICH frames ghost beneath the current one.
// ---------------------------------------------------------------------------

export interface OnionSkinTarget {
  frame: Frame;
  /** Opacity multiplier to render this ghost with. */
  opacity: number;
}

/**
 * Frames to render faintly beneath the active one while drawing: the
 * previous frame, plus the next one when `onionNext` is on. Empty when the
 * setting is off, animation is off, or there is no neighbour.
 */
export function onionSkinTargets(doc: DreamDocument): OnionSkinTarget[] {
  if (!doc.frames) return [];
  const settings = animationSettingsOf(doc);
  if (!settings.onionSkin) return [];
  const index = activeFrameIndex(doc);
  const opacity = clamp(settings.onionOpacity, 0, 1);
  const targets: OnionSkinTarget[] = [];
  const prev = doc.frames[index - 1];
  if (prev) targets.push({ frame: prev, opacity });
  const next = doc.frames[index + 1];
  if (settings.onionNext && next) targets.push({ frame: next, opacity });
  return targets;
}

// ---------------------------------------------------------------------------
// Sprite-sheet layout: pack N frames into a near-square grid.
// ---------------------------------------------------------------------------

export interface SpriteSheetLayout {
  columns: number;
  rows: number;
  /** Full sheet size in pixels. */
  width: number;
  height: number;
  /** Top-left corner of each frame, in play order. */
  positions: Point[];
}

/** Max frames per row so sheets stay readable; rows grow downward. */
export const SPRITE_SHEET_MAX_COLUMNS = 8;

export function spriteSheetLayout(
  frameCount: number,
  frameWidth: number,
  frameHeight: number,
  maxColumns = SPRITE_SHEET_MAX_COLUMNS,
): SpriteSheetLayout {
  const count = Math.max(1, frameCount);
  const columns = Math.min(count, Math.max(1, maxColumns), Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / columns);
  const positions: Point[] = [];
  for (let i = 0; i < count; i += 1) {
    positions.push({ x: (i % columns) * frameWidth, y: Math.floor(i / columns) * frameHeight });
  }
  return { columns, rows, width: columns * frameWidth, height: rows * frameHeight, positions };
}

/** Frames to present/play, falling back to a single implicit frame. */
export function presentationFrames(doc: DreamDocument): { layers: Layer[] }[] {
  return doc.frames ?? [{ layers: doc.layers }];
}
