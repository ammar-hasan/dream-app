/**
 * Command-based undo/redo.
 *
 * Every mutation of the document goes through a Command that knows how to
 * apply AND revert itself. The stack stores commands, never snapshots, so
 * memory stays flat no matter how large the document grows.
 */

import {
  appendOperation,
  insertLayer,
  mapLayer,
  moveLayer,
  removeLayerById,
  removeOperation,
  updateLayerProps,
  withFrames,
} from './document';
import { disableAnimation, enableAnimation } from './animation';
import {
  INVERSE_TRANSFORM,
  cropDocument,
  resizeDocument,
  transformLayer,
  translateLayer,
  type LayerTransform,
} from './transform';
import type { DreamDocument, Frame, Layer, Operation, Rect } from './types';

export interface Command {
  label: string;
  apply(doc: DreamDocument): DreamDocument;
  revert(doc: DreamDocument): DreamDocument;
}

export class History {
  private past: Command[] = [];
  private future: Command[] = [];

  constructor(readonly limit = 100) {
    if (limit < 1) throw new Error('History limit must be >= 1');
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  get depth(): number {
    return this.past.length;
  }

  /** Apply a command and record it. Clears the redo stack. */
  execute(doc: DreamDocument, command: Command): DreamDocument {
    const next = command.apply(doc);
    this.past.push(command);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    return next;
  }

  /** Revert the most recent command. No-op (same doc) when empty. */
  undo(doc: DreamDocument): DreamDocument {
    const command = this.past.pop();
    if (!command) return doc;
    this.future.push(command);
    return command.revert(doc);
  }

  /** Re-apply the most recently undone command. No-op when empty. */
  redo(doc: DreamDocument): DreamDocument {
    const command = this.future.pop();
    if (!command) return doc;
    this.past.push(command);
    return command.apply(doc);
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}

// ---------------------------------------------------------------------------
// Command factories. Factories that need prior state (e.g. a layer's index)
// capture it from the document passed at creation time.
// ---------------------------------------------------------------------------

export function addOperationCommand(layerId: string, op: Operation): Command {
  return {
    label: 'Draw',
    apply: (doc) => appendOperation(doc, layerId, op),
    revert: (doc) => removeOperation(doc, layerId, op.id),
  };
}

export function addLayerCommand(layer: Layer, index?: number): Command {
  return {
    label: 'Add layer',
    apply: (doc) => insertLayer(doc, layer, index),
    revert: (doc) => removeLayerById(doc, layer.id),
  };
}

export function removeLayerCommand(doc: DreamDocument, layerId: string): Command {
  const owner = doc.frames?.find((f) => f.layers.some((l) => l.id === layerId));
  const stack = owner ? owner.layers : doc.layers;
  const index = stack.findIndex((l) => l.id === layerId);
  const layer = stack[index];
  return {
    label: 'Delete layer',
    apply: (d) => removeLayerById(d, layerId),
    revert: (d) => (layer ? insertLayer(d, layer, index, owner?.id) : d),
  };
}

export function moveLayerCommand(doc: DreamDocument, layerId: string, toIndex: number): Command {
  const fromIndex = doc.layers.findIndex((l) => l.id === layerId);
  return {
    label: 'Reorder layer',
    apply: (d) => moveLayer(d, layerId, toIndex),
    revert: (d) => moveLayer(d, layerId, fromIndex),
  };
}

type LayerPatch = Partial<Pick<Layer, 'name' | 'visible' | 'opacity' | 'locked'>>;

export function updateLayerCommand(
  doc: DreamDocument,
  layerId: string,
  patch: LayerPatch,
  label = 'Update layer',
): Command {
  const layer = doc.layers.find((l) => l.id === layerId);
  const previous: LayerPatch = {};
  if (layer) {
    for (const key of Object.keys(patch) as (keyof LayerPatch)[]) {
      previous[key] = layer[key] as never;
    }
  }
  return {
    label,
    apply: (d) => updateLayerProps(d, layerId, patch),
    revert: (d) => updateLayerProps(d, layerId, previous),
  };
}

// ---------------------------------------------------------------------------
// Slice 2: raster editing commands (move, flip/rotate, filter bake, crop,
// resize). Transforms are invertible by construction; crop/resize/filter
// capture the previous layers array (structural sharing keeps that cheap).
// ---------------------------------------------------------------------------

/** Move all content of a layer by (dx, dy); revert shifts it back. */
export function translateLayerCommand(layerId: string, dx: number, dy: number): Command {
  return {
    label: 'Move layer',
    apply: (doc) => translateLayer(doc, layerId, dx, dy),
    revert: (doc) => translateLayer(doc, layerId, -dx, -dy),
  };
}

/** Flip/rotate a layer; revert applies the inverse transform. */
export function transformLayerCommand(layerId: string, transform: LayerTransform): Command {
  return {
    label: 'Transform layer',
    apply: (doc) => transformLayer(doc, layerId, transform),
    revert: (doc) => transformLayer(doc, layerId, INVERSE_TRANSFORM[transform]),
  };
}

/** Replace a layer's operations (e.g. bake a filtered raster); revert restores them. */
export function replaceLayerContentCommand(
  doc: DreamDocument,
  layerId: string,
  operations: Operation[],
  label = 'Apply filter',
): Command {
  const previous = doc.layers.find((l) => l.id === layerId)?.operations ?? [];
  return {
    label,
    apply: (d) => mapLayer(d, layerId, (layer) => ({ ...layer, operations })),
    revert: (d) => mapLayer(d, layerId, (layer) => ({ ...layer, operations: previous })),
  };
}

/** Crop the document; revert restores the previous size and every frame. */
export function cropDocumentCommand(doc: DreamDocument, rect: Rect): Command {
  const { width, height, layers, frames, activeFrameId } = doc;
  return {
    label: 'Crop',
    apply: (d) => cropDocument(d, rect),
    revert: (d) => ({ ...d, width, height, layers, frames, activeFrameId, updatedAt: Date.now() }),
  };
}

/** Resize the document (content scaled to fit); revert restores the original. */
export function resizeDocumentCommand(doc: DreamDocument, width: number, height: number): Command {
  const { width: w, height: h, layers, frames, activeFrameId } = doc;
  return {
    label: 'Resize',
    apply: (d) => resizeDocument(d, width, height),
    revert: (d) => ({
      ...d,
      width: w,
      height: h,
      layers,
      frames,
      activeFrameId,
      updatedAt: Date.now(),
    }),
  };
}

// ---------------------------------------------------------------------------
// Slice 4: frame commands. One History per document — frame CRUD is undoable
// alongside strokes and layers; SWITCHING frames is navigation (not undoable,
// like the workspace mode). Content commands are frame-aware (document.ts),
// so undo stays correct even after switching frames mid-history.
// ---------------------------------------------------------------------------

/** Turn animation on/off; revert restores the exact previous frames. */
export function setAnimationEnabledCommand(doc: DreamDocument, enabled: boolean): Command {
  const { frames, activeFrameId } = doc;
  return {
    label: enabled ? 'Animate' : 'Remove animation',
    apply: (d) => (enabled ? enableAnimation(d) : disableAnimation(d)),
    revert: (d) =>
      enabled ? disableAnimation(d) : { ...d, frames, activeFrameId, updatedAt: Date.now() },
  };
}

/**
 * Insert a frame after the active one (by default) and make it active —
 * flipbook flow: press "+" and you're drawing on the new page.
 */
export function addFrameCommand(doc: DreamDocument, frame: Frame, index?: number): Command {
  const frames = doc.frames ?? [];
  const previousActiveId = doc.activeFrameId;
  const at = Math.max(
    0,
    Math.min(index ?? activeIndex(frames, previousActiveId) + 1, frames.length),
  );
  return {
    label: 'Add frame',
    apply: (d) => {
      const next = (d.frames ?? []).slice();
      next.splice(at, 0, frame);
      return withFrames(d, next, frame.id);
    },
    revert: (d) =>
      withFrames(
        d,
        (d.frames ?? []).filter((f) => f.id !== frame.id),
        previousActiveId ?? '',
      ),
  };
}

function activeIndex(frames: Frame[], activeId: string | undefined): number {
  const index = frames.findIndex((f) => f.id === activeId);
  return index === -1 ? frames.length - 1 : index;
}

/** Duplicate a frame (deep clone, new ids) right after itself and activate it. */
export function duplicateFrameCommand(doc: DreamDocument, clone: Frame, frameId: string): Command {
  const frames = doc.frames ?? [];
  const at = frames.findIndex((f) => f.id === frameId) + 1;
  const previousActiveId = doc.activeFrameId;
  return {
    label: 'Duplicate frame',
    apply: (d) => {
      const next = (d.frames ?? []).slice();
      next.splice(at, 0, clone);
      return withFrames(d, next, clone.id);
    },
    revert: (d) =>
      withFrames(
        d,
        (d.frames ?? []).filter((f) => f.id !== clone.id),
        previousActiveId ?? '',
      ),
  };
}

/** Remove a frame; the active frame falls back to the nearest neighbour. */
export function removeFrameCommand(doc: DreamDocument, frameId: string): Command {
  const frames = doc.frames ?? [];
  const index = frames.findIndex((f) => f.id === frameId);
  const frame = frames[index];
  const previousActiveId = doc.activeFrameId;
  return {
    label: 'Delete frame',
    apply: (d) => {
      const current = d.frames ?? [];
      if (current.length <= 1) return d; // an animation always keeps one frame
      const next = current.filter((f) => f.id !== frameId);
      const activeId =
        d.activeFrameId === frameId
          ? next[Math.min(index, next.length - 1)].id
          : (d.activeFrameId ?? next[next.length - 1].id);
      return withFrames(d, next, activeId);
    },
    revert: (d) => {
      if (!frame) return d;
      const next = (d.frames ?? []).slice();
      next.splice(Math.min(index, next.length), 0, frame);
      return withFrames(d, next, previousActiveId ?? frame.id);
    },
  };
}

/** Reorder frames (drag or move-left/right); revert moves it back. */
export function moveFrameCommand(doc: DreamDocument, frameId: string, toIndex: number): Command {
  const frames = doc.frames ?? [];
  const fromIndex = frames.findIndex((f) => f.id === frameId);
  const target = Math.max(0, Math.min(toIndex, frames.length - 1));
  const activeId = doc.activeFrameId ?? '';
  return {
    label: 'Reorder frame',
    apply: (d) => {
      const next = (d.frames ?? []).slice();
      if (fromIndex === -1) return d;
      const [frame] = next.splice(fromIndex, 1);
      next.splice(target, 0, frame);
      return withFrames(d, next, d.activeFrameId ?? activeId);
    },
    revert: (d) => {
      const next = (d.frames ?? []).slice();
      const at = next.findIndex((f) => f.id === frameId);
      if (at === -1) return d;
      const [frame] = next.splice(at, 1);
      next.splice(fromIndex, 0, frame);
      return withFrames(d, next, d.activeFrameId ?? activeId);
    },
  };
}
