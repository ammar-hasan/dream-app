/**
 * App mode: hotspots link frames ("screens") into an interactive prototype.
 * Pure helpers over the document — no DOM, fully unit-testable.
 *
 * Hotspots live on `frame.hotspots` (additive, backward compatible) and
 * mutate through the undoable commands in history.ts. A hotspot whose target
 * frame was deleted is "broken": flagged in the panel, ignored in the app
 * preview and the standalone HTML export.
 */

import { genId } from './document';
import type { DreamDocument, Frame, Hotspot, HotspotTransition, Rect } from './types';

/** Smallest hotspot the Link tool commits (document pixels) — tinier drags are slips. */
export const MIN_HOTSPOT_SIZE = 4;

export function createHotspot(
  rect: Rect,
  targetFrameId: string,
  transition: HotspotTransition = 'fade',
): Hotspot {
  return { id: genId('hotspot'), rect, targetFrameId, transition };
}

/** Hotspots of one frame (empty when animation is off or the frame is gone). */
export function frameHotspots(doc: DreamDocument, frameId: string): Hotspot[] {
  return doc.frames?.find((f) => f.id === frameId)?.hotspots ?? [];
}

/** Hotspots of the active frame — what the Link tool and the panel edit. */
export function activeHotspots(doc: DreamDocument): Hotspot[] {
  return doc.activeFrameId ? frameHotspots(doc, doc.activeFrameId) : [];
}

/** True when any frame in the document has at least one hotspot. */
export function hasHotspots(doc: DreamDocument): boolean {
  return (doc.frames ?? []).some((f) => (f.hotspots?.length ?? 0) > 0);
}

/** A hotspot is broken when its target frame no longer exists. */
export function isHotspotBroken(doc: DreamDocument, hotspot: Hotspot): boolean {
  return hotspotTargetIndex(doc, hotspot) === -1;
}

/** Index of the hotspot's target frame in play order (-1 = broken). */
export function hotspotTargetIndex(doc: DreamDocument, hotspot: Hotspot): number {
  return (doc.frames ?? []).findIndex((f) => f.id === hotspot.targetFrameId);
}

/** The hotspot (if any) whose rect contains the document-space point. */
export function hotspotAt(frame: Frame, point: { x: number; y: number }): Hotspot | undefined {
  return (frame.hotspots ?? []).find(
    (h) =>
      point.x >= h.rect.x &&
      point.x <= h.rect.x + h.rect.width &&
      point.y >= h.rect.y &&
      point.y <= h.rect.y + h.rect.height,
  );
}
