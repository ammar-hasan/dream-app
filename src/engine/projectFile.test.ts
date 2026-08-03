/**
 * Round-trip fidelity tests for the .dream project file format. The raster
 * codec is a fake (base64 of the raw bytes, not real PNG) — the REAL PNG
 * codecs are tested where they live (mcp-server's Node codec round-trips
 * through this same module against actual PNGs).
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_ADJUSTMENTS } from './filters';
import {
  DREAM_PROJECT_VERSION,
  decodeProject,
  encodeProject,
  type RasterCodec,
} from './projectFile';
import type { DreamDocument, RasterPatch } from './types';

/** Structure-preserving fake codec: base64 of a JSON envelope, not real PNG. */
const fakeCodec: RasterCodec = {
  async encode(patch: RasterPatch) {
    const json = JSON.stringify({
      width: patch.width,
      height: patch.height,
      data: Array.from(patch.data),
    });
    return `data:image/png;base64,${Buffer.from(json, 'utf8').toString('base64')}`;
  },
  async decode(dataUrl: string) {
    const json = Buffer.from(dataUrl.split(',')[1], 'base64').toString('utf8');
    const parsed = JSON.parse(json) as { width: number; height: number; data: number[] };
    return { width: parsed.width, height: parsed.height, data: new Uint8ClampedArray(parsed.data) };
  },
};

function richDocument(): DreamDocument {
  return {
    id: 'doc-1',
    name: 'Maria prototype',
    width: 320,
    height: 240,
    background: '#112233',
    mode: 'design',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
    animation: { fps: 12, loop: true, onionSkin: true, onionNext: false, onionOpacity: 0.3 },
    game: {
      cast: { hero: 'layer-a', good: 'layer-b' },
      settings: { fallSpeed: 120, spawnInterval: 1.5, lives: 3 },
    },
    narration: { audio: 'data:audio/webm;base64,T25jZSB1cG9uIGEgdGltZQ==', durationMs: 1800 },
    activeFrameId: 'frame-1',
    layers: [
      {
        id: 'layer-a',
        name: 'Sketch',
        visible: true,
        opacity: 0.8,
        blendMode: 'multiply',
        adjustments: { ...DEFAULT_ADJUSTMENTS, contrast: 12 },
        locked: false,
        operations: [
          {
            kind: 'stroke',
            id: 'op-stroke',
            tool: 'brush',
            color: '#ff0000',
            opacity: 1,
            size: 4,
            points: [
              { x: 1, y: 2 },
              { x: 30, y: 40 },
            ],
            widths: [0.5, 1.5],
          },
          {
            kind: 'stroke',
            id: 'op-spray',
            tool: 'spray',
            color: '#00ff00',
            opacity: 1,
            size: 8,
            seed: 42,
            density: 55,
            points: [{ x: 5, y: 5 }],
          },
          {
            kind: 'shape',
            id: 'op-shape',
            shape: 'ellipse',
            color: '#0000ff',
            opacity: 0.5,
            size: 2,
            fill: true,
            from: { x: 0, y: 0 },
            to: { x: 50, y: 30 },
          },
          {
            kind: 'shape',
            id: 'op-connector',
            shape: 'line',
            lineStyle: 'double-arrow',
            color: '#00ffff',
            opacity: 1,
            size: 3,
            from: { x: 20, y: 50 },
            to: { x: 80, y: 50 },
          },
          {
            kind: 'text',
            id: 'op-text',
            color: '#ffffff',
            opacity: 1,
            position: { x: 10, y: 20 },
            text: 'Hello Maria',
            fontSize: 24,
            fontFamily: 'sans-serif',
          },
        ],
      },
      {
        id: 'layer-b',
        name: 'Pixels',
        visible: false,
        opacity: 1,
        blendMode: 'normal',
        adjustments: { ...DEFAULT_ADJUSTMENTS },
        locked: true,
        operations: [
          {
            kind: 'image',
            id: 'op-image',
            color: '#000000',
            opacity: 1,
            scale: 2,
            patch: {
              x: 4,
              y: 6,
              width: 2,
              height: 2,
              data: new Uint8ClampedArray([
                255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 64, 9, 8, 7, 6,
              ]),
            },
          },
          {
            kind: 'fill',
            id: 'op-fill',
            color: '#ff00ff',
            opacity: 0.9,
            origin: { x: 1, y: 1 },
            patch: {
              x: 0,
              y: 0,
              width: 1,
              height: 2,
              data: new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8]),
            },
          },
        ],
      },
    ],
    frames: [
      {
        id: 'frame-1',
        layers: [], // replaced below with the mirrored stack
        presentation: {
          transition: 'fade',
          durationMs: 5000,
          notes: 'Welcome everyone',
          caption: 'Our first message',
        },
        hotspots: [
          {
            id: 'hot-1',
            rect: { x: 0, y: 0, width: 50, height: 20 },
            targetFrameId: 'frame-2',
            transition: 'slide',
          },
        ],
      },
      {
        id: 'frame-2',
        layers: [
          {
            id: 'layer-c',
            name: 'Screen 2',
            visible: true,
            opacity: 1,
            blendMode: 'screen',
            adjustments: { ...DEFAULT_ADJUSTMENTS },
            locked: false,
            operations: [
              {
                kind: 'image',
                id: 'op-image-2',
                color: '#123456',
                opacity: 1,
                scale: 1,
                patch: {
                  x: 0,
                  y: 0,
                  width: 1,
                  height: 1,
                  data: new Uint8ClampedArray([10, 20, 30, 40]),
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function withMirroredLayers(doc: DreamDocument): DreamDocument {
  // The live-document invariant: doc.layers IS the active frame's stack.
  const frames = doc.frames!.map((f) =>
    f.id === doc.activeFrameId ? { ...f, layers: doc.layers } : f,
  );
  return { ...doc, frames };
}

describe('projectFile', () => {
  it('round-trips a full document (strokes, shapes, text, images, frames, hotspots, game)', async () => {
    const doc = withMirroredLayers(richDocument());
    const text = await encodeProject(doc, fakeCodec);
    const parsed = JSON.parse(text);
    expect(parsed.format).toBe('dream-project');
    expect(parsed.version).toBe(DREAM_PROJECT_VERSION);

    const decoded = await decodeProject(text, fakeCodec);
    expect(decoded).toEqual(doc);
  });

  it('round-trips a document without frames', async () => {
    const doc = withMirroredLayers(richDocument());
    const plain = { ...doc };
    delete plain.frames;
    delete plain.activeFrameId;
    const text = await encodeProject(plain, fakeCodec);
    expect(await decodeProject(text, fakeCodec)).toEqual(plain);
  });

  it('opens older projects without blend modes or adjustments using neutral defaults', async () => {
    const text = await encodeProject(withMirroredLayers(richDocument()), fakeCodec);
    const parsed = JSON.parse(text);
    for (const layer of parsed.document.layers) {
      delete layer.blendMode;
      delete layer.adjustments;
    }
    for (const frame of parsed.document.frames) {
      for (const layer of frame.layers) {
        delete layer.blendMode;
        delete layer.adjustments;
      }
    }

    const decoded = await decodeProject(JSON.stringify(parsed), fakeCodec);
    expect(decoded.layers.every((layer) => layer.blendMode === 'normal')).toBe(true);
    expect(
      decoded.frames?.every((frame) => frame.layers.every((layer) => layer.blendMode === 'normal')),
    ).toBe(true);
    expect(
      decoded.frames?.every((frame) =>
        frame.layers.every((layer) => layer.adjustments?.contrast === 0),
      ),
    ).toBe(true);
  });

  it('serializes raster payloads as PNG data URLs, not byte arrays', async () => {
    const doc = withMirroredLayers(richDocument());
    const text = await encodeProject(doc, fakeCodec);
    expect(text).toContain('data:image/png;base64,');
    expect(text).not.toContain('"data":[255,0,0');
  });

  it('rejects non-JSON input', async () => {
    await expect(decodeProject('not json', fakeCodec)).rejects.toThrow('invalid JSON');
  });

  it('rejects a JSON file with the wrong format marker', async () => {
    await expect(decodeProject('{"format":"png","version":1}', fakeCodec)).rejects.toThrow(
      'Not a .dream file',
    );
  });

  it('rejects an unsupported version', async () => {
    const text = JSON.stringify({ format: 'dream-project', version: 99, document: {} });
    await expect(decodeProject(text, fakeCodec)).rejects.toThrow('Unsupported .dream version');
  });

  it('rejects a raster op whose PNG dimensions lie', async () => {
    const doc = withMirroredLayers(richDocument());
    const lyingCodec: RasterCodec = {
      ...fakeCodec,
      async decode() {
        return { width: 99, height: 99, data: new Uint8ClampedArray(99 * 99 * 4) };
      },
    };
    const text = await encodeProject(doc, fakeCodec);
    await expect(decodeProject(text, lyingCodec)).rejects.toThrow('PNG is 99×99');
  });
});
