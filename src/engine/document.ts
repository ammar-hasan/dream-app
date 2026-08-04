/**
 * Document factories and immutable update helpers.
 *
 * All helpers return a NEW document object (structural sharing: unchanged
 * layers keep their identity) so history commands stay cheap and Zustand
 * change detection keeps working.
 *
 * Frames: when a document has `frames`, `doc.layers` mirrors the active
 * frame's layer stack. Helpers that edit layers by id first look in the
 * active stack and then in every other frame, so undo/redo stays correct
 * even after the user switches frames mid-history (see AGENTS.md).
 */

import type {
  Color,
  DreamDocument,
  Frame,
  Hotspot,
  Layer,
  Operation,
  SlidePresentation,
} from './types';
import { DEFAULT_ADJUSTMENTS } from './filters';

let idCounter = 0;

/** Collision-safe enough id for client-side entities. */
export function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function createLayer(name = 'Layer', operations: Operation[] = []): Layer {
  return {
    id: genId('layer'),
    name,
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    locked: false,
    operations,
  };
}

export function createFrame(layers?: Layer[]): Frame {
  return { id: genId('frame'), layers: layers ?? [createLayer('Layer 1')] };
}

export interface CreateDocumentOptions {
  width: number;
  height: number;
  name?: string;
  background?: Color;
  id?: string;
}

export function createDocument(options: CreateDocumentOptions): DreamDocument {
  const now = Date.now();
  return {
    id: options.id ?? genId('doc'),
    name: options.name ?? 'Untitled',
    width: Math.max(1, Math.round(options.width)),
    height: Math.max(1, Math.round(options.height)),
    background: options.background ?? '#ffffff',
    layers: [createLayer('Layer 1')],
    mode: 'draw',
    createdAt: now,
    updatedAt: now,
  };
}

function touch(doc: DreamDocument, layers: Layer[]): DreamDocument {
  if (doc.frames && doc.activeFrameId) return withFrameLayers(doc, doc.activeFrameId, layers);
  return { ...doc, layers, updatedAt: Date.now() };
}

/**
 * Replace the layer stack of one frame. When that frame is the active one
 * (or the document has no frames at all) the change is mirrored into
 * `doc.layers`; otherwise only the frame's own stack is updated.
 */
export function withFrameLayers(
  doc: DreamDocument,
  frameId: string,
  layers: Layer[],
): DreamDocument {
  if (!doc.frames) return { ...doc, layers, updatedAt: Date.now() };
  const frames = doc.frames.map((f) => (f.id === frameId ? { ...f, layers } : f));
  return {
    ...doc,
    frames,
    layers: doc.activeFrameId === frameId ? layers : doc.layers,
    updatedAt: Date.now(),
  };
}

/** The frame whose layers are mirrored into `doc.layers`, if any. */
export function activeFrameOf(doc: DreamDocument): Frame | undefined {
  return doc.frames?.find((f) => f.id === doc.activeFrameId);
}

/**
 * Replace the hotspot list of one frame (app-mode links). Like layer edits,
 * hotspots are document data and mutate through undoable commands.
 */
export function withFrameHotspots(
  doc: DreamDocument,
  frameId: string,
  hotspots: Hotspot[],
): DreamDocument {
  if (!doc.frames) return doc;
  const frames = doc.frames.map((f) => (f.id === frameId ? { ...f, hotspots } : f));
  return { ...doc, frames, updatedAt: Date.now() };
}

/** Replace one frame's presentation metadata without touching its layers. */
export function withFramePresentation(
  doc: DreamDocument,
  frameId: string,
  presentation: SlidePresentation | undefined,
): DreamDocument {
  if (!doc.frames?.some((frame) => frame.id === frameId)) return doc;
  const frames = doc.frames.map((frame) => {
    if (frame.id !== frameId) return frame;
    if (!presentation) {
      const next = { ...frame };
      delete next.presentation;
      return next;
    }
    return { ...frame, presentation };
  });
  return { ...doc, frames, updatedAt: Date.now() };
}

export interface FrameCaptionUpdate {
  frameId: string;
  /** Empty or absent removes the caption while preserving other frame settings. */
  caption?: string;
}

/** Replace several frame captions while preserving each frame's slide settings. */
export function withFrameCaptions(
  doc: DreamDocument,
  updates: readonly FrameCaptionUpdate[],
): DreamDocument {
  if (!doc.frames || updates.length === 0) return doc;
  const captions = new Map(updates.map(({ frameId, caption }) => [frameId, caption]));
  let changed = false;
  const frames = doc.frames.map((frame) => {
    if (!captions.has(frame.id)) return frame;
    const caption = captions.get(frame.id)?.trim() || undefined;
    if (frame.presentation?.caption === caption) return frame;
    changed = true;
    const presentation = { ...frame.presentation };
    if (caption) presentation.caption = caption;
    else delete presentation.caption;
    if (Object.keys(presentation).length === 0) {
      const next = { ...frame };
      delete next.presentation;
      return next;
    }
    return { ...frame, presentation };
  });
  return changed ? { ...doc, frames, updatedAt: Date.now() } : doc;
}

/** Replace the frames array (and optionally the mirrored active stack). */
export function withFrames(
  doc: DreamDocument,
  frames: Frame[],
  activeFrameId: string,
): DreamDocument {
  const active = frames.find((f) => f.id === activeFrameId) ?? frames[frames.length - 1];
  return {
    ...doc,
    frames,
    activeFrameId: active?.id,
    layers: active?.layers ?? doc.layers,
    updatedAt: Date.now(),
  };
}

/** Replace the layers array (of the active frame, when animated). */
export function withLayers(doc: DreamDocument, layers: Layer[]): DreamDocument {
  return touch(doc, layers);
}

/** Find the frame whose stack contains `layerId` (active stack first). */
function frameOwningLayer(doc: DreamDocument, layerId: string): Frame | undefined {
  if (!doc.frames) return undefined;
  if (doc.layers.some((l) => l.id === layerId)) return activeFrameOf(doc);
  return doc.frames.find((f) => f.layers.some((l) => l.id === layerId));
}

/**
 * Apply `fn` to the layer with `layerId`; no-op (same doc) if not found.
 * The layer may live in any frame — edits land in the owning frame.
 */
export function mapLayer(
  doc: DreamDocument,
  layerId: string,
  fn: (layer: Layer) => Layer,
): DreamDocument {
  const owner = frameOwningLayer(doc, layerId);
  if (doc.frames && !owner) return doc;
  if (owner && owner.id !== doc.activeFrameId) {
    return withFrameLayers(
      doc,
      owner.id,
      owner.layers.map((l) => (l.id === layerId ? fn(l) : l)),
    );
  }
  const index = doc.layers.findIndex((l) => l.id === layerId);
  if (index === -1) return doc;
  const layers = doc.layers.slice();
  layers[index] = fn(layers[index]);
  return touch(doc, layers);
}

export function appendOperation(doc: DreamDocument, layerId: string, op: Operation): DreamDocument {
  return mapLayer(doc, layerId, (layer) => ({
    ...layer,
    operations: [...layer.operations, op],
  }));
}

export function removeOperation(doc: DreamDocument, layerId: string, opId: string): DreamDocument {
  return mapLayer(doc, layerId, (layer) => ({
    ...layer,
    operations: layer.operations.filter((op) => op.id !== opId),
  }));
}

/**
 * Insert a layer at `index` (default: top of the stack). Index is clamped.
 * Targets the active frame unless `frameId` names another frame (undo of a
 * layer deletion can land after the user switched frames).
 */
export function insertLayer(
  doc: DreamDocument,
  layer: Layer,
  index?: number,
  frameId?: string,
): DreamDocument {
  const targetId = frameId ?? doc.activeFrameId;
  const frame = doc.frames?.find((f) => f.id === targetId);
  if (doc.frames && !frame) return doc;
  const base = frame ? frame.layers : doc.layers;
  const at = Math.max(0, Math.min(index ?? base.length, base.length));
  const layers = base.slice();
  layers.splice(at, 0, layer);
  return frame ? withFrameLayers(doc, frame.id, layers) : touch(doc, layers);
}

export function removeLayerById(doc: DreamDocument, layerId: string): DreamDocument {
  const owner = frameOwningLayer(doc, layerId);
  if (doc.frames && !owner) return doc;
  if (owner && owner.id !== doc.activeFrameId) {
    return withFrameLayers(
      doc,
      owner.id,
      owner.layers.filter((l) => l.id !== layerId),
    );
  }
  if (!doc.layers.some((l) => l.id === layerId)) return doc;
  return touch(
    doc,
    doc.layers.filter((l) => l.id !== layerId),
  );
}

/** Move a layer to `toIndex` (clamped); layers[0] is the bottom of the stack. */
export function moveLayer(doc: DreamDocument, layerId: string, toIndex: number): DreamDocument {
  const fromIndex = doc.layers.findIndex((l) => l.id === layerId);
  if (fromIndex === -1) return doc;
  const target = Math.max(0, Math.min(toIndex, doc.layers.length - 1));
  if (target === fromIndex) return doc;
  const layers = doc.layers.slice();
  const [layer] = layers.splice(fromIndex, 1);
  layers.splice(target, 0, layer);
  return touch(doc, layers);
}

export function updateLayerProps(
  doc: DreamDocument,
  layerId: string,
  patch: Partial<
    Pick<Layer, 'name' | 'visible' | 'opacity' | 'blendMode' | 'adjustments' | 'mask' | 'locked'>
  >,
): DreamDocument {
  return mapLayer(doc, layerId, (layer) => ({ ...layer, ...patch }));
}
