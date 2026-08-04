/**
 * Command-based undo/redo.
 *
 * Every mutation of the document goes through a Command that knows how to
 * apply AND revert itself. The stack stores commands, never snapshots, so
 * memory stays flat no matter how large the document grows.
 */

import {
  appendOperation,
  createFrame,
  insertLayer,
  mapLayer,
  moveLayer,
  removeLayerById,
  removeOperation,
  updateLayerProps,
  withFrameHotspots,
  withFrameCaptions,
  withFramePresentation,
  withFrames,
} from './document';
import type { FrameCaptionUpdate } from './document';
import { disableAnimation, enableAnimation } from './animation';
import {
  INVERSE_TRANSFORM,
  cropDocument,
  resizeDocument,
  transformLayer,
  translateLayer,
  type LayerTransform,
} from './transform';
import type {
  DreamDocument,
  Frame,
  Hotspot,
  Layer,
  Operation,
  ProjectColor,
  Rect,
  SlidePresentation,
} from './types';

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

/**
 * Append several ops as ONE undoable step — e.g. a mirrored gesture, where a
 * single undo must remove the whole symmetric bloom.
 */
export function addOperationsCommand(layerId: string, ops: Operation[]): Command {
  return {
    label: 'Draw',
    apply: (doc) => ops.reduce((d, op) => appendOperation(d, layerId, op), doc),
    revert: (doc) => ops.reduce((d, op) => removeOperation(d, layerId, op.id), doc),
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

type LayerPatch = Partial<
  Pick<Layer, 'name' | 'visible' | 'opacity' | 'blendMode' | 'adjustments' | 'mask' | 'locked'>
>;

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

/** Replace the project's named-color list as one invertible document change. */
export function setProjectColorsCommand(
  doc: DreamDocument,
  projectColors: ProjectColor[],
  label = 'Update project colors',
): Command {
  const previous = doc.projectColors;
  return {
    label,
    apply: (current) => ({ ...current, projectColors, updatedAt: Date.now() }),
    revert: (current) => ({ ...current, projectColors: previous, updatedAt: Date.now() }),
  };
}

/**
 * Delete one project color AND bake its last value into every op that linked
 * to it, so artwork never visually shifts when a swatch is removed. Revert is
 * scoped to the fields detach touches (projectColors/frames/layers) and
 * re-derives `layers` from the *current* active frame, so undo never teleports
 * the user or reverts out-of-history state (mode, animation, game, narration).
 */
export function deleteProjectColorCommand(doc: DreamDocument, id: string): Command {
  const colors = doc.projectColors ?? [];
  const target = colors.find((color) => color.id === id);
  if (!target) return { label: 'Delete project color', apply: (d) => d, revert: (d) => d };
  const value = target.value;
  // Capture only what detach touches, so revert can spread `current` and keep
  // every out-of-history field (activeFrameId, mode, animation, game, narration).
  const prevColors = doc.projectColors;
  const prevFrames = doc.frames;
  const prevLayers = doc.layers;
  return {
    label: 'Delete project color',
    apply: (current) => detachColorFromDocument(current, id, value),
    revert: (current) => {
      // Restore the touched fields; mirror the active frame's layers so the
      // user stays on whatever frame they navigated to after the delete.
      const frames = prevFrames;
      const activeId = current.activeFrameId;
      const mirror = frames?.find((frame) => frame.id === activeId)?.layers ?? prevLayers;
      return {
        ...current,
        projectColors: prevColors,
        ...(frames ? { frames } : {}),
        layers: mirror,
        updatedAt: Date.now(),
      };
    },
  };
}

/** Stamp `value` into every op referencing `id`, then drop the ref, doc-wide. */
function detachColorFromDocument(doc: DreamDocument, id: string, value: string): DreamDocument {
  const detachLayers = (layers: Layer[]): Layer[] => {
    let changed = false;
    const next = layers.map((layer) => {
      let opsChanged = false;
      const ops = layer.operations.map((op) => {
        if (op.colorRef === id) {
          opsChanged = true;
          const { colorRef: _ref, ...rest } = op;
          void _ref;
          return { ...rest, color: value };
        }
        return op;
      });
      if (!opsChanged) return layer;
      changed = true;
      return { ...layer, operations: ops };
    });
    return changed ? next : layers;
  };

  const projectColors = (doc.projectColors ?? []).filter((color) => color.id !== id);
  if (!doc.frames) {
    return { ...doc, layers: detachLayers(doc.layers), projectColors, updatedAt: Date.now() };
  }
  let framesChanged = false;
  const frames = doc.frames.map((frame) => {
    const layers = detachLayers(frame.layers);
    if (layers === frame.layers) return frame;
    framesChanged = true;
    return { ...frame, layers };
  });
  if (!framesChanged) return { ...doc, projectColors, updatedAt: Date.now() };
  const active = frames.find((frame) => frame.id === doc.activeFrameId) ?? frames[0];
  return {
    ...doc,
    frames,
    layers: active ? active.layers : doc.layers,
    projectColors,
    updatedAt: Date.now(),
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

/**
 * Add a reviewed, already-painted storyboard as one undoable document edit.
 * A blank static canvas becomes the storyboard; existing art/frames stay in
 * front so generation never destroys the user's work.
 */
export function addStoryboardFramesCommand(doc: DreamDocument, frames: readonly Frame[]): Command {
  const previousFrames = doc.frames;
  const previousActiveId = doc.activeFrameId;
  const previousLayers = doc.layers;
  const keepStaticCanvas = doc.layers.some((layer) => layer.operations.length > 0);
  const existing = doc.frames ?? (keepStaticCanvas ? [createFrame(doc.layers)] : []);
  const storyboard = [...frames];
  const nextFrames = [...existing, ...storyboard];
  const firstStoryboardId = storyboard[0]?.id;
  return {
    label: 'Create storyboard',
    apply: (d) => (firstStoryboardId ? withFrames(d, nextFrames, firstStoryboardId) : d),
    revert: (d) => {
      if (previousFrames) {
        return withFrames(d, previousFrames, previousActiveId ?? previousFrames[0]?.id ?? '');
      }
      const restored: DreamDocument = {
        ...d,
        layers: previousLayers,
        updatedAt: Date.now(),
      };
      delete restored.frames;
      delete restored.activeFrameId;
      return restored;
    },
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

/** Replace one slide's presentation settings as a single undoable edit. */
export function setFramePresentationCommand(
  doc: DreamDocument,
  frameId: string,
  presentation: SlidePresentation | undefined,
): Command {
  const previous = doc.frames?.find((frame) => frame.id === frameId)?.presentation;
  return {
    label: 'Edit slide settings',
    apply: (d) => withFramePresentation(d, frameId, presentation),
    revert: (d) => withFramePresentation(d, frameId, previous),
  };
}

/** Replace any number of video captions as one undoable edit. */
export function setFrameCaptionsCommand(
  doc: DreamDocument,
  updates: readonly FrameCaptionUpdate[],
): Command {
  const ids = new Set(updates.map(({ frameId }) => frameId));
  const previous = (doc.frames ?? [])
    .filter((frame) => ids.has(frame.id))
    .map((frame) => ({ frameId: frame.id, caption: frame.presentation?.caption }));
  return {
    label: 'Edit video captions',
    apply: (d) => withFrameCaptions(d, updates),
    revert: (d) => withFrameCaptions(d, previous),
  };
}

// ---------------------------------------------------------------------------
// Slice 13 (app mode): hotspot commands. Hotspots are document data on the
// frame, so add/edit/delete are undoable like every other document mutation.
// ---------------------------------------------------------------------------

/** Add a hotspot to a frame; revert removes it. */
export function addHotspotCommand(frameId: string, hotspot: Hotspot): Command {
  return {
    label: 'Add link',
    apply: (d) => {
      const current = d.frames?.find((f) => f.id === frameId)?.hotspots ?? [];
      return withFrameHotspots(d, frameId, [...current, hotspot]);
    },
    revert: (d) => {
      const current = d.frames?.find((f) => f.id === frameId)?.hotspots ?? [];
      return withFrameHotspots(
        d,
        frameId,
        current.filter((h) => h.id !== hotspot.id),
      );
    },
  };
}

/** Remove a hotspot; revert re-inserts it at its original position. */
export function removeHotspotCommand(
  doc: DreamDocument,
  frameId: string,
  hotspotId: string,
): Command {
  const current = doc.frames?.find((f) => f.id === frameId)?.hotspots ?? [];
  const index = current.findIndex((h) => h.id === hotspotId);
  const hotspot = current[index];
  return {
    label: 'Delete link',
    apply: (d) => {
      const list = d.frames?.find((f) => f.id === frameId)?.hotspots ?? [];
      return withFrameHotspots(
        d,
        frameId,
        list.filter((h) => h.id !== hotspotId),
      );
    },
    revert: (d) => {
      if (!hotspot) return d;
      const list = (d.frames?.find((f) => f.id === frameId)?.hotspots ?? []).slice();
      list.splice(Math.min(index, list.length), 0, hotspot);
      return withFrameHotspots(d, frameId, list);
    },
  };
}

/** Edit a hotspot's target or transition; revert restores the previous values. */
export function updateHotspotCommand(
  doc: DreamDocument,
  frameId: string,
  hotspotId: string,
  patch: Partial<Pick<Hotspot, 'targetFrameId' | 'transition'>>,
): Command {
  const hotspot = doc.frames
    ?.find((f) => f.id === frameId)
    ?.hotspots?.find((h) => h.id === hotspotId);
  const previous: typeof patch = {};
  if (hotspot) {
    for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
      previous[key] = hotspot[key] as never;
    }
  }
  const map = (d: DreamDocument, p: typeof patch) => {
    const list = d.frames?.find((f) => f.id === frameId)?.hotspots ?? [];
    return withFrameHotspots(
      d,
      frameId,
      list.map((h) => (h.id === hotspotId ? { ...h, ...p } : h)),
    );
  };
  return {
    label: 'Edit link',
    apply: (d) => map(d, patch),
    revert: (d) => map(d, previous),
  };
}
