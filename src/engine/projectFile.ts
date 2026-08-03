/**
 * The `.dream` project file format (version 1).
 *
 * A `.dream` file is UTF-8 JSON:
 *
 * ```json
 * {
 *   "format": "dream-project",
 *   "version": 1,
 *   "document": { ...DreamDocument... }
 * }
 * ```
 *
 * The document is the engine's `DreamDocument` verbatim, with one exception:
 * raster payloads (the `patch.data` bytes of fill and image operations) are
 * not raw arrays — they are base64 PNG data URLs
 * (`data:image/png;base64,...`), so files stay compact and any tool with a
 * PNG decoder can read the pixels. Patch `x`/`y`/`width`/`height` stay as
 * plain numbers next to the data URL.
 *
 * This module is pure and structure-agnostic: PNG encoding/decoding goes
 * through the injectable `RasterCodec`, so it is fully testable in Node.
 * The browser codec lives in `ui/projectFileCodec.ts` (canvas), the Node
 * codec in `mcp-server/` (@napi-rs/canvas).
 */

import { normalizeAdjustments } from './filters';
import { isLayerBlendMode } from './types';
import type { DreamDocument, Layer, Operation, RasterPatch } from './types';

export const DREAM_PROJECT_FORMAT = 'dream-project';
export const DREAM_PROJECT_VERSION = 1;

/** The JSON envelope of a `.dream` file. */
export interface DreamProjectFile {
  format: typeof DREAM_PROJECT_FORMAT;
  version: typeof DREAM_PROJECT_VERSION;
  /** The document with raster patches in serialized (PNG data URL) form. */
  document: unknown;
}

/** Serialized form of a RasterPatch: pixels as a base64 PNG data URL. */
export interface SerializedRasterPatch {
  x: number;
  y: number;
  width: number;
  height: number;
  /** `data:image/png;base64,...` */
  data: string;
}

/**
 * PNG codec for raster payloads. Browsers implement this with a canvas;
 * Node implementations with a canvas package. `decode` must return the
 * exact pixel dimensions encoded in the PNG.
 */
export interface RasterCodec {
  /** RGBA bytes → PNG data URL. */
  encode(patch: RasterPatch): Promise<string>;
  /** PNG data URL → RGBA bytes + dimensions. */
  decode(dataUrl: string): Promise<{ width: number; height: number; data: Uint8ClampedArray }>;
}

function isRasterOp(op: Operation): op is Operation & { patch: RasterPatch } {
  return op.kind === 'fill' || op.kind === 'image';
}

async function serializeOperation(op: Operation, codec: RasterCodec): Promise<unknown> {
  if (!isRasterOp(op)) return op;
  const serialized: SerializedRasterPatch = {
    x: op.patch.x,
    y: op.patch.y,
    width: op.patch.width,
    height: op.patch.height,
    data: await codec.encode(op.patch),
  };
  return { ...op, patch: serialized };
}

async function serializeLayers(layers: Layer[], codec: RasterCodec): Promise<unknown[]> {
  return Promise.all(
    layers.map(async (layer) => ({
      ...layer,
      operations: await Promise.all(layer.operations.map((op) => serializeOperation(op, codec))),
    })),
  );
}

/**
 * Serialize a document to its on-disk JSON form. When the document has
 * frames, `layers` mirrors the ACTIVE frame's serialized stack (the same
 * invariant the live document keeps — see AGENTS.md rule 5).
 */
async function serializeDocument(doc: DreamDocument, codec: RasterCodec): Promise<unknown> {
  if (!doc.frames) return { ...doc, layers: await serializeLayers(doc.layers, codec) };
  const frames = await Promise.all(
    doc.frames.map(async (frame) => ({
      ...frame,
      layers: await serializeLayers(frame.layers, codec),
    })),
  );
  const active = frames.find((f) => f.id === doc.activeFrameId);
  return {
    ...doc,
    frames,
    layers: active ? active.layers : await serializeLayers(doc.layers, codec),
  };
}

/** Encode a document as the text content of a `.dream` file. */
export async function encodeProject(doc: DreamDocument, codec: RasterCodec): Promise<string> {
  const file: DreamProjectFile = {
    format: DREAM_PROJECT_FORMAT,
    version: DREAM_PROJECT_VERSION,
    document: await serializeDocument(doc, codec),
  };
  return JSON.stringify(file);
}

function assertEnvelope(parsed: unknown): DreamProjectFile {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Not a .dream file: expected a JSON object');
  }
  const file = parsed as Partial<DreamProjectFile>;
  if (file.format !== DREAM_PROJECT_FORMAT) {
    throw new Error(`Not a .dream file: missing format "${DREAM_PROJECT_FORMAT}"`);
  }
  if (file.version !== DREAM_PROJECT_VERSION) {
    throw new Error(`Unsupported .dream version: ${String(file.version)}`);
  }
  if (typeof file.document !== 'object' || file.document === null) {
    throw new Error('Corrupt .dream file: missing document');
  }
  return file as DreamProjectFile;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function deserializeOperation(op: unknown, codec: RasterCodec): Promise<Operation> {
  if (!isRecord(op) || (op.kind !== 'fill' && op.kind !== 'image')) return op as Operation;
  const patch = op.patch;
  if (!isRecord(patch) || typeof patch.data !== 'string') {
    throw new Error(`Corrupt .dream file: raster op "${String(op.id)}" has no PNG payload`);
  }
  const width = patch.width;
  const height = patch.height;
  if (typeof width !== 'number' || typeof height !== 'number') {
    throw new Error(`Corrupt .dream file: raster op "${String(op.id)}" has no patch size`);
  }
  const decoded = await codec.decode(patch.data);
  if (decoded.width !== width || decoded.height !== height) {
    throw new Error(
      `Corrupt .dream file: raster op "${String(op.id)}" PNG is ` +
        `${decoded.width}×${decoded.height}, expected ${width}×${height}`,
    );
  }
  const restored: RasterPatch = {
    x: patch.x as number,
    y: patch.y as number,
    width,
    height,
    data: decoded.data,
  };
  return { ...op, patch: restored } as unknown as Operation;
}

async function deserializeLayers(layers: unknown, codec: RasterCodec): Promise<Layer[]> {
  if (!Array.isArray(layers)) throw new Error('Corrupt .dream file: layers must be an array');
  return Promise.all(
    layers.map(async (layer) => {
      if (!isRecord(layer) || !Array.isArray(layer.operations)) {
        throw new Error('Corrupt .dream file: layer is missing operations');
      }
      return {
        ...layer,
        blendMode: isLayerBlendMode(layer.blendMode) ? layer.blendMode : 'normal',
        adjustments: normalizeAdjustments(layer.adjustments),
        operations: await Promise.all(
          layer.operations.map((op) => deserializeOperation(op, codec)),
        ),
      } as unknown as Layer;
    }),
  );
}

/**
 * Decode the text content of a `.dream` file back into a live document.
 * Throws an `Error` with a human-readable message on any format violation.
 */
export async function decodeProject(text: string, codec: RasterCodec): Promise<DreamDocument> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Not a .dream file: invalid JSON');
  }
  const file = assertEnvelope(parsed);
  const raw = file.document as Record<string, unknown>;

  if (typeof raw.width !== 'number' || typeof raw.height !== 'number') {
    throw new Error('Corrupt .dream file: document has no size');
  }

  if (Array.isArray(raw.frames)) {
    const frames = await Promise.all(
      raw.frames.map(async (frame) => {
        if (!isRecord(frame)) throw new Error('Corrupt .dream file: bad frame');
        return { ...frame, layers: await deserializeLayers(frame.layers, codec) } as Record<
          string,
          unknown
        > & { layers: Layer[] };
      }),
    );
    const active = frames.find((f) => f.id === raw.activeFrameId);
    return {
      ...raw,
      frames,
      layers: active ? active.layers : await deserializeLayers(raw.layers, codec),
    } as unknown as DreamDocument;
  }

  return { ...raw, layers: await deserializeLayers(raw.layers, codec) } as unknown as DreamDocument;
}
