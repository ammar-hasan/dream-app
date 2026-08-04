/**
 * Tool cores for the dream-mcp server. Each function takes plain arguments
 * (paths + options), does its file I/O, and returns a JSON-serializable
 * result — the MCP protocol wiring in index.ts stays a thin adapter over
 * these. All document logic is the real engine from the root package
 * (src/engine), so a .dream file written here is byte-compatible with the
 * browser app.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { activeFrameIndex } from '../../src/engine/animation';
import { buildAppExportData, buildAppHtml } from '../../src/engine/appExport';
import {
  contrastRatio,
  MAX_PROJECT_COLORS,
  MAX_PROJECT_COLOR_NAME,
  normalizeHex,
} from '../../src/engine/color';
import {
  appendOperation,
  createDocument,
  createLayer,
  genId,
  insertLayer,
  moveLayer,
  removeLayerById,
  updateLayerProps,
} from '../../src/engine/document';
import { hotspotTargetIndex } from '../../src/engine/hotspots';
import {
  ADJUSTMENT_RANGES,
  normalizeAdjustments,
  type Adjustments,
} from '../../src/engine/filters';
import { decodeProject, encodeProject } from '../../src/engine/projectFile';
import { pressureWidth } from '../../src/engine/tools/stroke';
import { DEFAULT_SETTINGS } from '../../src/engine/tools/types';
import { isLayerBlendMode } from '../../src/engine/types';
import type {
  DreamDocument,
  Layer,
  LayerBlendMode,
  LayerMaskMode,
  LayerMaskStroke,
  ProjectColor,
  ShapeKind,
  ShapeOp,
  StrokeOp,
  TextOp,
} from '../../src/engine/types';
import { nodeRasterCodec, renderLayersToPng, renderLayersToPngDataUrl } from './nodeCodec';

/** Load and decode a .dream file. */
export async function loadProject(projectPath: string): Promise<DreamDocument> {
  let text: string;
  try {
    text = await readFile(projectPath, 'utf8');
  } catch {
    throw new Error(`Cannot read project file: ${projectPath}`);
  }
  return decodeProject(text, nodeRasterCodec);
}

/** Encode and save a .dream file. */
export async function saveProject(projectPath: string, doc: DreamDocument): Promise<void> {
  await writeFile(projectPath, await encodeProject(doc, nodeRasterCodec), 'utf8');
}

export interface ProjectSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  projectColors: ProjectColor[];
  projectColorTextContrast: Array<{ id: string; ratio: number; aaNormalText: boolean }>;
  mode: string;
  layers: number;
  frames: number | null;
  hotspots: number;
  brokenHotspots: number;
  operations: { total: number } & Record<string, number>;
  hasGameSetup: boolean;
  createdAt: number;
  updatedAt: number;
}

function summarize(doc: DreamDocument): ProjectSummary {
  const operations: { total: number } & Record<string, number> = { total: 0 };
  const countOps = (layers: Layer[]) => {
    for (const layer of layers) {
      for (const op of layer.operations) {
        operations[op.kind] = (operations[op.kind] ?? 0) + 1;
        operations.total += 1;
      }
    }
  };
  let hotspots = 0;
  let brokenHotspots = 0;
  if (doc.frames) {
    for (const frame of doc.frames) {
      countOps(frame.layers);
      for (const hotspot of frame.hotspots ?? []) {
        hotspots += 1;
        if (hotspotTargetIndex(doc, hotspot) === -1) brokenHotspots += 1;
      }
    }
  } else {
    countOps(doc.layers);
  }
  const projectColors = doc.projectColors ?? [];
  return {
    id: doc.id,
    name: doc.name,
    width: doc.width,
    height: doc.height,
    background: doc.background,
    projectColors,
    projectColorTextContrast: projectColors.map((color) => {
      const ratio = contrastRatio(color.value, doc.background) ?? 1;
      return {
        id: color.id,
        ratio: Math.round(ratio * 100) / 100,
        aaNormalText: ratio >= 4.5,
      };
    }),
    mode: doc.mode ?? 'draw',
    layers: doc.layers.length,
    frames: doc.frames ? doc.frames.length : null,
    hotspots,
    brokenHotspots,
    operations,
    hasGameSetup: doc.game !== undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** dream.read_project — a structural summary of a .dream file. */
export async function readProject(projectPath: string): Promise<ProjectSummary> {
  return summarize(await loadProject(projectPath));
}

export interface SetProjectColorOptions {
  /** Existing project-color id or exact name. Omit to add a color. */
  color?: string;
  name: string;
  value: string;
}

/** dream.set_project_color — add, rename, or replace one portable named color. */
export async function setProjectColor(
  projectPath: string,
  options: SetProjectColorOptions,
): Promise<ProjectColor & { index: number }> {
  const doc = await loadProject(projectPath);
  const colors = doc.projectColors ?? [];
  const name = options.name.trim();
  if (!name) throw new Error('project color name must not be empty');
  if (name.length > MAX_PROJECT_COLOR_NAME) {
    throw new Error(`project color name must be at most ${MAX_PROJECT_COLOR_NAME} characters`);
  }
  const value = normalizeHex(options.value);
  if (!value) throw new Error(`Invalid project color: ${options.value}`);

  const index = options.color
    ? colors.findIndex(
        (candidate) => candidate.id === options.color || candidate.name === options.color,
      )
    : colors.length;
  if (options.color && index === -1) {
    throw new Error(`No project color with id or name "${options.color}"`);
  }
  if (!options.color && colors.length >= MAX_PROJECT_COLORS) {
    throw new Error(`A project can contain at most ${MAX_PROJECT_COLORS} named colors`);
  }

  const projectColor: ProjectColor = options.color
    ? { ...colors[index]!, name, value }
    : { id: genId('color'), name, value };
  const projectColors = [...colors];
  projectColors[index] = projectColor;
  await saveProject(projectPath, { ...doc, projectColors, updatedAt: Date.now() });
  return { ...projectColor, index };
}

/** dream.remove_project_color — remove one portable named color by id or exact name. */
export async function removeProjectColor(
  projectPath: string,
  selector: string,
): Promise<ProjectColor & { index: number; remaining: number }> {
  const doc = await loadProject(projectPath);
  const colors = doc.projectColors ?? [];
  const index = colors.findIndex(
    (candidate) => candidate.id === selector || candidate.name === selector,
  );
  const projectColor = colors[index];
  if (!projectColor) throw new Error(`No project color with id or name "${selector}"`);
  const projectColors = colors.filter((_, colorIndex) => colorIndex !== index);
  await saveProject(projectPath, { ...doc, projectColors, updatedAt: Date.now() });
  return { ...projectColor, index, remaining: projectColors.length };
}

export interface CreateProjectOptions {
  width: number;
  height: number;
  background?: string;
  name?: string;
}

const MAX_DIMENSION = 8192;

/**
 * Resolve an optional `colorRef` against the project's saved colors. Returns
 * `{ color, colorRef }` to spread onto the op when the id exists (stamping the
 * swatch's current value into `color` so the link's fallback invariant holds),
 * or throws if the caller asked for a link that is not present. Passing nothing
 * yields an empty object so call sites stay unconditional.
 */
function resolveColorRef(
  doc: DreamDocument,
  colorRef: string | undefined,
): { color?: string; colorRef?: string } {
  if (colorRef === undefined) return {};
  const swatch = (doc.projectColors ?? []).find((color) => color.id === colorRef);
  if (!swatch) {
    throw new Error(`No project color with id "${colorRef}"`);
  }
  return { color: swatch.value, colorRef };
}

/** dream.create_project — write a fresh .dream file. */
export async function createProject(
  projectPath: string,
  options: CreateProjectOptions,
): Promise<ProjectSummary> {
  const width = Math.round(options.width);
  const height = Math.round(options.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error('width and height must be positive integers');
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(`width and height must be at most ${MAX_DIMENSION}`);
  }
  const background = options.background ?? '#ffffff';
  const color = normalizeHex(background);
  if (!color) throw new Error(`Invalid background color: ${background}`);
  const doc = createDocument({ width, height, background: color, name: options.name });
  await saveProject(projectPath, doc);
  return summarize(doc);
}

export interface LayerInfo {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: LayerBlendMode;
  adjustments: Adjustments;
  mask: { enabled: boolean; strokes: number } | null;
  locked: boolean;
  operations: number;
}

export interface LayerListing {
  frames: { id: string; active: boolean; layers: LayerInfo[] }[] | null;
  /** The active stack (mirrors the active frame when animated). */
  layers: LayerInfo[];
}

function layerInfo(layer: Layer): LayerInfo {
  return {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity,
    blendMode: layer.blendMode ?? 'normal',
    adjustments: normalizeAdjustments(layer.adjustments),
    mask: layer.mask ? { enabled: layer.mask.enabled, strokes: layer.mask.strokes.length } : null,
    locked: layer.locked,
    operations: layer.operations.length,
  };
}

/** dream.list_layers — the layer stack(s) of a .dream file. */
export async function listLayers(projectPath: string): Promise<LayerListing> {
  const doc = await loadProject(projectPath);
  return {
    frames: doc.frames
      ? doc.frames.map((frame) => ({
          id: frame.id,
          active: frame.id === doc.activeFrameId,
          layers: frame.layers.map(layerInfo),
        }))
      : null,
    layers: doc.layers.map(layerInfo),
  };
}

export interface AddLayerOptions {
  /** Layer name; defaults to the next numbered layer in the active frame. */
  name?: string;
}

export interface AddLayerResult {
  layerId: string;
  layerName: string;
  index: number;
  frameId: string | null;
}

/** dream.add_layer — add a new top layer to the active frame. */
export async function addLayer(
  projectPath: string,
  options: AddLayerOptions = {},
): Promise<AddLayerResult> {
  const doc = await loadProject(projectPath);
  const name = options.name?.trim() || `Layer ${doc.layers.length + 1}`;
  const layer = createLayer(name);
  const index = doc.layers.length;
  await saveProject(projectPath, insertLayer(doc, layer));
  return {
    layerId: layer.id,
    layerName: layer.name,
    index,
    frameId: doc.activeFrameId ?? null,
  };
}

export interface UpdateLayerOptions {
  /** Layer id or name in the active frame. */
  layer: string;
  name?: string;
  visible?: boolean;
  opacity?: number;
  blendMode?: string;
  adjustments?: Partial<Adjustments>;
  /** Add/enable/disable/delete the layer's non-destructive opacity mask. */
  mask?: 'add' | 'enable' | 'disable' | 'delete';
  locked?: boolean;
  /** New zero-based stack index; 0 is the bottom. */
  index?: number;
}

export interface UpdateLayerResult extends LayerInfo {
  index: number;
  frameId: string | null;
}

/** dream.update_layer — configure or reorder one layer in the active frame. */
export async function updateLayer(
  projectPath: string,
  options: UpdateLayerOptions,
): Promise<UpdateLayerResult> {
  const doc = await loadProject(projectPath);
  const layer = doc.layers.find(
    (candidate) => candidate.id === options.layer || candidate.name === options.layer,
  );
  if (!layer) throw new Error(`No layer with id or name "${options.layer}" in the active frame`);

  const hasUpdate =
    options.name !== undefined ||
    options.visible !== undefined ||
    options.opacity !== undefined ||
    options.blendMode !== undefined ||
    options.adjustments !== undefined ||
    options.mask !== undefined ||
    options.locked !== undefined ||
    options.index !== undefined;
  if (!hasUpdate) throw new Error('Provide at least one layer property to update');

  const patch: Partial<
    Pick<Layer, 'name' | 'visible' | 'opacity' | 'blendMode' | 'adjustments' | 'mask' | 'locked'>
  > = {};
  if (options.name !== undefined) {
    const name = options.name.trim();
    if (!name) throw new Error('layer name must not be empty');
    patch.name = name;
  }
  if (options.visible !== undefined) patch.visible = options.visible;
  if (options.locked !== undefined) patch.locked = options.locked;
  if (options.opacity !== undefined) {
    if (!Number.isFinite(options.opacity) || options.opacity < 0 || options.opacity > 1) {
      throw new Error('opacity must be between 0 and 1');
    }
    patch.opacity = options.opacity;
  }
  if (options.blendMode !== undefined) {
    if (!isLayerBlendMode(options.blendMode)) {
      throw new Error('blendMode must be normal, multiply, screen, overlay, darken or lighten');
    }
    patch.blendMode = options.blendMode;
  }
  if (options.adjustments !== undefined) {
    if (
      typeof options.adjustments !== 'object' ||
      options.adjustments === null ||
      Object.keys(options.adjustments).length === 0
    ) {
      throw new Error('adjustments must contain at least one setting');
    }
    const adjustments = normalizeAdjustments(layer.adjustments);
    for (const [name, value] of Object.entries(options.adjustments)) {
      if (!(name in ADJUSTMENT_RANGES)) throw new Error(`Unknown adjustment: ${name}`);
      const key = name as keyof Adjustments;
      const [min, max] = ADJUSTMENT_RANGES[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
        throw new Error(`${name} must be between ${min} and ${max}`);
      }
      adjustments[key] = value;
    }
    patch.adjustments = adjustments;
  }
  if (options.mask !== undefined) {
    if (layer.locked) throw new Error('Cannot change the mask of a locked layer');
    if (!['add', 'enable', 'disable', 'delete'].includes(options.mask)) {
      throw new Error('mask must be add, enable, disable or delete');
    }
    if (options.mask === 'delete') patch.mask = undefined;
    else if (options.mask === 'add' || options.mask === 'enable') {
      patch.mask = { ...(layer.mask ?? { strokes: [] }), enabled: true };
    } else {
      if (!layer.mask) throw new Error('Cannot disable a layer without a mask');
      patch.mask = { ...layer.mask, enabled: false };
    }
  }
  if (
    options.index !== undefined &&
    (!Number.isInteger(options.index) || options.index < 0 || options.index >= doc.layers.length)
  ) {
    throw new Error(`index must be an integer from 0 to ${doc.layers.length - 1}`);
  }

  let updated = Object.keys(patch).length > 0 ? updateLayerProps(doc, layer.id, patch) : doc;
  if (options.index !== undefined) updated = moveLayer(updated, layer.id, options.index);
  await saveProject(projectPath, updated);
  const result = updated.layers.find((candidate) => candidate.id === layer.id)!;
  return {
    ...layerInfo(result),
    index: updated.layers.findIndex((candidate) => candidate.id === layer.id),
    frameId: updated.activeFrameId ?? null,
  };
}

export interface RemoveLayerResult {
  layerId: string;
  layerName: string;
  index: number;
  remainingLayers: number;
  frameId: string | null;
}

/** dream.remove_layer — remove a non-final layer from the active frame. */
export async function removeLayer(
  projectPath: string,
  layerSelector: string,
): Promise<RemoveLayerResult> {
  const doc = await loadProject(projectPath);
  const index = doc.layers.findIndex(
    (layer) => layer.id === layerSelector || layer.name === layerSelector,
  );
  const layer = doc.layers[index];
  if (!layer) throw new Error(`No layer with id or name "${layerSelector}" in the active frame`);
  if (doc.layers.length <= 1) throw new Error('Cannot remove the last layer in a frame');

  const updated = removeLayerById(doc, layer.id);
  await saveProject(projectPath, updated);
  return {
    layerId: layer.id,
    layerName: layer.name,
    index,
    remainingLayers: updated.layers.length,
    frameId: updated.activeFrameId ?? null,
  };
}

export interface AddTextOptions {
  text: string;
  x: number;
  y: number;
  /** Font size in document pixels (default 24). */
  size?: number;
  /** Color as #rgb/#rrggbb (default #000000). */
  color?: string;
  /**
   * Id of a saved project color to link this op to. When set, the op follows
   * the swatch's value on every render; `color` is still required as the
   * fallback. Throws if no project color has this id.
   */
  colorRef?: string;
  fontFamily?: string;
  /** Layer id or name; default: the top layer of the active frame. */
  layer?: string;
}

export interface AddTextResult {
  opId: string;
  layerId: string;
  layerName: string;
}

export interface StrokePointInput {
  x: number;
  y: number;
  /** Optional stylus-pressure sample, 0..1. */
  pressure?: number;
}

export interface AddStrokeOptions {
  points: StrokePointInput[];
  tool?: 'brush' | 'pencil' | 'eraser';
  color?: string;
  /** Id of a saved project color to link this op to (see AddTextOptions). */
  colorRef?: string;
  size?: number;
  opacity?: number;
  /** Layer id or name; default: the top layer of the active frame. */
  layer?: string;
}

export interface AddMaskStrokeOptions {
  points: StrokePointInput[];
  mode?: LayerMaskMode;
  size?: number;
  opacity?: number;
  /** Layer id or name; default: the top layer of the active frame. */
  layer?: string;
}

export interface AddMaskStrokeResult {
  maskStrokeId: string;
  layerId: string;
  layerName: string;
  strokes: number;
}

const MAX_STROKE_POINTS = 10_000;

/** dream.add_stroke — append an ordinary freehand stroke to a layer. */
export async function addStroke(
  projectPath: string,
  options: AddStrokeOptions,
): Promise<AddTextResult> {
  if (!Array.isArray(options.points) || options.points.length < 2) {
    throw new Error('points must contain at least 2 samples');
  }
  if (options.points.length > MAX_STROKE_POINTS) {
    throw new Error(`points must contain at most ${MAX_STROKE_POINTS} samples`);
  }
  for (const [index, point] of options.points.entries()) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error(`point ${index} coordinates must be finite`);
    }
    if (
      point.pressure !== undefined &&
      (!Number.isFinite(point.pressure) || point.pressure < 0 || point.pressure > 1)
    ) {
      throw new Error(`point ${index} pressure must be between 0 and 1`);
    }
  }
  const tool = options.tool ?? 'brush';
  if (!['brush', 'pencil', 'eraser'].includes(tool)) {
    throw new Error(`Invalid stroke tool: ${tool}`);
  }
  const color = normalizeHex(options.color ?? DEFAULT_SETTINGS.color);
  if (!color) throw new Error(`Invalid color: ${options.color}`);
  const size = options.size ?? DEFAULT_SETTINGS.size;
  if (!Number.isFinite(size) || size <= 0 || size > MAX_DIMENSION) {
    throw new Error(`size must be greater than 0 and at most ${MAX_DIMENSION}`);
  }
  const opacity = options.opacity ?? DEFAULT_SETTINGS.opacity;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error('opacity must be between 0 and 1');
  }

  const doc = await loadProject(projectPath);
  const layer = options.layer
    ? doc.layers.find(
        (candidate) => candidate.id === options.layer || candidate.name === options.layer,
      )
    : doc.layers[doc.layers.length - 1];
  if (!layer) {
    throw new Error(
      options.layer
        ? `No layer with id or name "${options.layer}" in the active frame`
        : 'The document has no layers',
    );
  }

  const op: StrokeOp = {
    kind: 'stroke',
    id: genId('op'),
    tool,
    points: options.points.map(({ x, y }) => ({ x, y })),
    color,
    size,
    // Match the drawing engine: pencil and eraser are always fully opaque.
    opacity: tool === 'brush' ? opacity : 1,
    // Erasers render with destination-out and ignore color, so don't attach a link.
    ...(tool !== 'eraser' ? resolveColorRef(doc, options.colorRef) : {}),
  };
  if (options.points.some((point) => point.pressure !== undefined)) {
    op.widths = options.points.map((point) => pressureWidth(point.pressure ?? 1));
  }
  await saveProject(projectPath, appendOperation(doc, layer.id, op));
  return { opId: op.id, layerId: layer.id, layerName: layer.name };
}

/** dream.add_mask_stroke — add or extend a layer's editable opacity mask. */
export async function addMaskStroke(
  projectPath: string,
  options: AddMaskStrokeOptions,
): Promise<AddMaskStrokeResult> {
  if (!Array.isArray(options.points) || options.points.length < 2) {
    throw new Error('points must contain at least 2 samples');
  }
  if (options.points.length > MAX_STROKE_POINTS) {
    throw new Error(`points must contain at most ${MAX_STROKE_POINTS} samples`);
  }
  for (const [index, point] of options.points.entries()) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error(`point ${index} coordinates must be finite`);
    }
    if (
      point.pressure !== undefined &&
      (!Number.isFinite(point.pressure) || point.pressure < 0 || point.pressure > 1)
    ) {
      throw new Error(`point ${index} pressure must be between 0 and 1`);
    }
  }
  const mode = options.mode ?? 'hide';
  if (mode !== 'hide' && mode !== 'reveal') throw new Error('mode must be hide or reveal');
  const size = options.size ?? DEFAULT_SETTINGS.size;
  if (!Number.isFinite(size) || size <= 0 || size > MAX_DIMENSION) {
    throw new Error(`size must be greater than 0 and at most ${MAX_DIMENSION}`);
  }
  const opacity = options.opacity ?? 1;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error('opacity must be between 0 and 1');
  }

  const doc = await loadProject(projectPath);
  const layer = options.layer
    ? doc.layers.find(
        (candidate) => candidate.id === options.layer || candidate.name === options.layer,
      )
    : doc.layers[doc.layers.length - 1];
  if (!layer) {
    throw new Error(
      options.layer
        ? `No layer with id or name "${options.layer}" in the active frame`
        : 'The document has no layers',
    );
  }
  if (layer.locked) throw new Error('Cannot paint the mask of a locked layer');
  const stroke: LayerMaskStroke = {
    id: genId('mask'),
    mode,
    points: options.points.map(({ x, y }) => ({ x, y })),
    size,
    opacity,
  };
  if (options.points.some((point) => point.pressure !== undefined)) {
    stroke.widths = options.points.map((point) => pressureWidth(point.pressure ?? 1));
  }
  const mask = layer.mask ?? { enabled: true, strokes: [] };
  const updatedMask = { ...mask, enabled: true, strokes: [...mask.strokes, stroke] };
  await saveProject(projectPath, updateLayerProps(doc, layer.id, { mask: updatedMask }));
  return {
    maskStrokeId: stroke.id,
    layerId: layer.id,
    layerName: layer.name,
    strokes: updatedMask.strokes.length,
  };
}

/** dream.add_text — append a text operation to a layer. Pure document edit. */
export async function addText(
  projectPath: string,
  options: AddTextOptions,
): Promise<AddTextResult> {
  const text = options.text.trim();
  if (text === '') throw new Error('text must not be empty');
  const color = normalizeHex(options.color ?? '#000000');
  if (!color) throw new Error(`Invalid color: ${options.color}`);

  const doc = await loadProject(projectPath);
  const layer = options.layer
    ? doc.layers.find((l) => l.id === options.layer || l.name === options.layer)
    : doc.layers[doc.layers.length - 1];
  if (!layer) {
    throw new Error(
      options.layer
        ? `No layer with id or name "${options.layer}" in the active frame`
        : 'The document has no layers',
    );
  }

  const op: TextOp = {
    kind: 'text',
    id: genId('op'),
    position: { x: options.x, y: options.y },
    text,
    color,
    opacity: 1,
    fontSize: options.size ?? 24,
    fontFamily: options.fontFamily ?? 'sans-serif',
    ...resolveColorRef(doc, options.colorRef),
  };
  await saveProject(projectPath, appendOperation(doc, layer.id, op));
  return { opId: op.id, layerId: layer.id, layerName: layer.name };
}

export interface AddShapeOptions {
  shape: ShapeKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Outline width in document pixels (default 2). */
  size?: number;
  /** Color as #rgb/#rrggbb (default #000000). */
  color?: string;
  /** Id of a saved project color to link this op to (see AddTextOptions). */
  colorRef?: string;
  /** Operation opacity, 0..1 (default 1). */
  opacity?: number;
  /** Fill a rectangle or ellipse instead of outlining it. */
  fill?: boolean;
  /** Layer id or name; default: the top layer of the active frame. */
  layer?: string;
}

/** dream.add_shape — append a line, rectangle or ellipse to a layer. */
export async function addShape(
  projectPath: string,
  options: AddShapeOptions,
): Promise<AddTextResult> {
  if (!['line', 'rectangle', 'ellipse'].includes(options.shape)) {
    throw new Error(`Invalid shape: ${options.shape}`);
  }
  const coordinates = [options.x1, options.y1, options.x2, options.y2];
  if (!coordinates.every(Number.isFinite)) throw new Error('shape coordinates must be finite');
  if (options.x1 === options.x2 && options.y1 === options.y2) {
    throw new Error('shape must have a visible size');
  }
  const size = options.size ?? 2;
  if (!Number.isFinite(size) || size <= 0) throw new Error('size must be greater than 0');
  const opacity = options.opacity ?? 1;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error('opacity must be between 0 and 1');
  }
  const color = normalizeHex(options.color ?? '#000000');
  if (!color) throw new Error(`Invalid color: ${options.color}`);

  const doc = await loadProject(projectPath);
  const layer = options.layer
    ? doc.layers.find(
        (candidate) => candidate.id === options.layer || candidate.name === options.layer,
      )
    : doc.layers[doc.layers.length - 1];
  if (!layer) {
    throw new Error(
      options.layer
        ? `No layer with id or name "${options.layer}" in the active frame`
        : 'The document has no layers',
    );
  }

  const op: ShapeOp = {
    kind: 'shape',
    id: genId('op'),
    shape: options.shape,
    from: { x: options.x1, y: options.y1 },
    to: { x: options.x2, y: options.y2 },
    color,
    opacity,
    size,
    ...(options.fill && options.shape !== 'line' ? { fill: true } : {}),
    ...resolveColorRef(doc, options.colorRef),
  };
  await saveProject(projectPath, appendOperation(doc, layer.id, op));
  return { opId: op.id, layerId: layer.id, layerName: layer.name };
}

export interface RenderPngOptions {
  /** Frame index to render (animated documents); default: the active stack. */
  frame?: number;
}

export interface RenderPngResult {
  outPath: string;
  width: number;
  height: number;
  bytes: number;
  frame: number | null;
}

/** dream.render_png — flatten the document (or one frame) to a PNG file. */
export async function renderPng(
  projectPath: string,
  outPath: string,
  options: RenderPngOptions = {},
): Promise<RenderPngResult> {
  const doc = await loadProject(projectPath);
  let layers = doc.layers;
  let frame: number | null = null;
  if (options.frame !== undefined) {
    if (!doc.frames) throw new Error('The document has no frames (animation is off)');
    const target = doc.frames[options.frame];
    if (!target) {
      throw new Error(`Frame index ${options.frame} out of range (0..${doc.frames.length - 1})`);
    }
    layers = target.layers;
    frame = options.frame;
  }
  const png = renderLayersToPng(doc, layers);
  await writeFile(outPath, png);
  return { outPath, width: doc.width, height: doc.height, bytes: png.length, frame };
}

export interface ExportAppResult {
  outPath: string;
  screens: number;
  hotspots: number;
  bytes: number;
}

/** dream.export_app — one self-contained interactive HTML prototype. */
export async function exportApp(projectPath: string, outPath: string): Promise<ExportAppResult> {
  const doc = await loadProject(projectPath);
  const frames = doc.frames ?? [];
  if (frames.length === 0) {
    throw new Error(
      'App export needs frames: enable animation in Dream so each frame becomes a screen',
    );
  }
  const images = frames.map((frame) => renderLayersToPngDataUrl(doc, frame.layers));
  const data = buildAppExportData(doc, images, activeFrameIndex(doc));
  const html = buildAppHtml(data);
  await writeFile(outPath, html, 'utf8');
  return {
    outPath,
    screens: data.frames.length,
    hotspots: data.frames.reduce((n, f) => n + f.hotspots.length, 0),
    bytes: Buffer.byteLength(html),
  };
}
