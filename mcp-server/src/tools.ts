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
import { normalizeHex } from '../../src/engine/color';
import {
  appendOperation,
  createDocument,
  createLayer,
  genId,
  insertLayer,
} from '../../src/engine/document';
import { hotspotTargetIndex } from '../../src/engine/hotspots';
import { decodeProject, encodeProject } from '../../src/engine/projectFile';
import type { DreamDocument, Layer, ShapeKind, ShapeOp, TextOp } from '../../src/engine/types';
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
  return {
    id: doc.id,
    name: doc.name,
    width: doc.width,
    height: doc.height,
    background: doc.background,
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

export interface CreateProjectOptions {
  width: number;
  height: number;
  background?: string;
  name?: string;
}

const MAX_DIMENSION = 8192;

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

export interface AddTextOptions {
  text: string;
  x: number;
  y: number;
  /** Font size in document pixels (default 24). */
  size?: number;
  /** Color as #rgb/#rrggbb (default #000000). */
  color?: string;
  fontFamily?: string;
  /** Layer id or name; default: the top layer of the active frame. */
  layer?: string;
}

export interface AddTextResult {
  opId: string;
  layerId: string;
  layerName: string;
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
