/**
 * Tests for the dream-mcp tool cores: real .dream files in tmp directories,
 * real PNG round-trips through @napi-rs/canvas. The MCP protocol wiring in
 * index.ts is intentionally untested — it is a thin adapter over these.
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { enableAnimation } from '../../src/engine/animation';
import {
  appendOperation,
  createFrame,
  createLayer,
  genId,
  withFrameHotspots,
} from '../../src/engine/document';
import type { FillOp, StrokeOp } from '../../src/engine/types';
import {
  addLayer,
  addShape,
  addStroke,
  addText,
  createProject,
  exportApp,
  listLayers,
  loadProject,
  readProject,
  removeLayer,
  renderPng,
  saveProject,
  updateLayer,
} from './tools';
import { nodeRasterCodec } from './nodeCodec';

let dir: string;
let projectPath: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dream-mcp-'));
  projectPath = join(dir, 'demo.dream');
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('dream-mcp tools', () => {
  it('create_project writes a valid .dream file', async () => {
    const summary = await createProject(projectPath, {
      width: 120,
      height: 80,
      background: '#102030',
      name: 'Agent sketch',
    });
    expect(summary).toMatchObject({
      name: 'Agent sketch',
      width: 120,
      height: 80,
      background: '#102030',
      layers: 1,
      frames: null,
      hotspots: 0,
    });

    const raw = JSON.parse(await readFile(projectPath, 'utf8'));
    expect(raw.format).toBe('dream-project');
    expect(raw.version).toBe(1);
  });

  it('create_project rejects bad sizes and colors', async () => {
    await expect(createProject(projectPath, { width: 0, height: 10 })).rejects.toThrow(
      'positive integers',
    );
    await expect(
      createProject(projectPath, { width: 10, height: 10, background: 'red' }),
    ).rejects.toThrow('Invalid background color');
  });

  it('add_text appends a text op to the top layer', async () => {
    const result = await addText(projectPath, {
      text: 'Made by an agent',
      x: 10,
      y: 20,
      size: 18,
      color: '#f0f',
    });
    const doc = await loadProject(projectPath);
    const topLayer = doc.layers[doc.layers.length - 1];
    expect(result.layerId).toBe(topLayer.id);
    const op = topLayer.operations.find((o) => o.id === result.opId);
    expect(op).toMatchObject({
      kind: 'text',
      text: 'Made by an agent',
      color: '#ff00ff',
      fontSize: 18,
      position: { x: 10, y: 20 },
    });
  });

  it('add_text can target a layer by name and validates input', async () => {
    await addText(projectPath, { text: 'second', x: 0, y: 0, layer: 'Layer 1' });
    await expect(addText(projectPath, { text: '  ', x: 0, y: 0 })).rejects.toThrow(
      'must not be empty',
    );
    await expect(addText(projectPath, { text: 'x', x: 0, y: 0, layer: 'nope' })).rejects.toThrow(
      'No layer with id or name "nope"',
    );
  });

  it('read_project summarizes layers, ops and mode', async () => {
    const summary = await readProject(projectPath);
    expect(summary.layers).toBe(1);
    expect(summary.operations).toMatchObject({ total: 2, text: 2 });
    expect(summary.frames).toBeNull();
    expect(summary.hasGameSetup).toBe(false);
  });

  it('list_layers returns the active stack', async () => {
    const listing = await listLayers(projectPath);
    expect(listing.frames).toBeNull();
    expect(listing.layers).toHaveLength(1);
    expect(listing.layers[0]).toMatchObject({ name: 'Layer 1', operations: 2, visible: true });
  });

  it('add_layer creates a new top layer in the active frame', async () => {
    const result = await addLayer(projectPath, { name: 'Agent shapes' });
    const doc = await loadProject(projectPath);
    expect(result).toMatchObject({
      layerId: doc.layers[1].id,
      layerName: 'Agent shapes',
      index: 1,
      frameId: null,
    });
    expect(doc.layers[1]).toMatchObject({
      name: 'Agent shapes',
      visible: true,
      locked: false,
      operations: [],
    });
  });

  it('add_layer writes through to an animated document active frame', async () => {
    const animatedPath = join(dir, 'animated-add.dream');
    await createProject(animatedPath, { width: 40, height: 30 });
    await saveProject(animatedPath, enableAnimation(await loadProject(animatedPath)));

    const result = await addLayer(animatedPath, { name: 'Frame artwork' });
    const doc = await loadProject(animatedPath);
    const activeFrame = doc.frames?.find((frame) => frame.id === doc.activeFrameId);
    expect(result.frameId).toBe(doc.activeFrameId);
    expect(doc.layers.map((layer) => layer.id)).toEqual(
      activeFrame?.layers.map((layer) => layer.id),
    );
    expect(doc.layers.at(-1)).toMatchObject({ name: 'Frame artwork' });
  });

  it('update_layer configures and reorders a layer by id or name', async () => {
    const managedPath = join(dir, 'managed.dream');
    await createProject(managedPath, { width: 40, height: 30 });
    const added = await addLayer(managedPath, { name: 'Agent draft' });

    const updated = await updateLayer(managedPath, {
      layer: added.layerId,
      name: 'Client logo',
      visible: false,
      opacity: 0.4,
      blendMode: 'multiply',
      adjustments: { brightness: 12, blur: 2 },
      locked: true,
      index: 0,
    });
    expect(updated).toMatchObject({
      id: added.layerId,
      name: 'Client logo',
      visible: false,
      opacity: 0.4,
      blendMode: 'multiply',
      adjustments: expect.objectContaining({ brightness: 12, blur: 2, contrast: 0 }),
      locked: true,
      index: 0,
      frameId: null,
    });
    expect((await listLayers(managedPath)).layers.map((layer) => layer.name)).toEqual([
      'Client logo',
      'Layer 1',
    ]);

    await updateLayer(managedPath, { layer: 'Client logo', name: 'Approved logo' });
    expect((await listLayers(managedPath)).layers[0]?.name).toBe('Approved logo');
  });

  it('update_layer validates its target, properties and index', async () => {
    const managedPath = join(dir, 'managed-errors.dream');
    await createProject(managedPath, { width: 40, height: 30 });
    await expect(updateLayer(managedPath, { layer: 'missing', name: 'Nope' })).rejects.toThrow(
      'No layer with id or name "missing"',
    );
    await expect(updateLayer(managedPath, { layer: 'Layer 1' })).rejects.toThrow(
      'at least one layer property',
    );
    await expect(updateLayer(managedPath, { layer: 'Layer 1', name: '  ' })).rejects.toThrow(
      'must not be empty',
    );
    await expect(updateLayer(managedPath, { layer: 'Layer 1', opacity: 2 })).rejects.toThrow(
      'between 0 and 1',
    );
    await expect(updateLayer(managedPath, { layer: 'Layer 1', blendMode: 'burn' })).rejects.toThrow(
      'blendMode must be',
    );
    await expect(updateLayer(managedPath, { layer: 'Layer 1', adjustments: {} })).rejects.toThrow(
      'at least one setting',
    );
    await expect(
      updateLayer(managedPath, { layer: 'Layer 1', adjustments: { blur: 21 } }),
    ).rejects.toThrow('blur must be between 0 and 20');
    await expect(updateLayer(managedPath, { layer: 'Layer 1', index: 1 })).rejects.toThrow(
      'integer from 0 to 0',
    );
  });

  it('remove_layer removes by id and name but preserves the final layer', async () => {
    const managedPath = join(dir, 'removed.dream');
    await createProject(managedPath, { width: 40, height: 30 });
    const byId = await addLayer(managedPath, { name: 'Delete by id' });
    await addLayer(managedPath, { name: 'Delete by name' });

    await expect(removeLayer(managedPath, 'missing')).rejects.toThrow(
      'No layer with id or name "missing"',
    );
    expect(await removeLayer(managedPath, byId.layerId)).toMatchObject({
      layerId: byId.layerId,
      layerName: 'Delete by id',
      remainingLayers: 2,
    });
    expect(await removeLayer(managedPath, 'Delete by name')).toMatchObject({
      layerName: 'Delete by name',
      remainingLayers: 1,
    });
    await expect(removeLayer(managedPath, 'Layer 1')).rejects.toThrow('last layer');
  });

  it('layer management preserves the animated active-frame mirror', async () => {
    const animatedPath = join(dir, 'animated-manage.dream');
    await createProject(animatedPath, { width: 40, height: 30 });
    await saveProject(animatedPath, enableAnimation(await loadProject(animatedPath)));
    const added = await addLayer(animatedPath, { name: 'Frame draft' });

    await updateLayer(animatedPath, { layer: added.layerId, name: 'Frame final', index: 0 });
    let doc = await loadProject(animatedPath);
    let activeFrame = doc.frames?.find((frame) => frame.id === doc.activeFrameId);
    expect(doc.layers).toEqual(activeFrame?.layers);
    expect(doc.layers[0]).toMatchObject({ id: added.layerId, name: 'Frame final' });

    await removeLayer(animatedPath, added.layerId);
    doc = await loadProject(animatedPath);
    activeFrame = doc.frames?.find((frame) => frame.id === doc.activeFrameId);
    expect(doc.layers).toEqual(activeFrame?.layers);
    expect(doc.layers).toHaveLength(1);
  });

  it('add_stroke persists an ordinary pressure-sensitive brush stroke', async () => {
    const strokePath = join(dir, 'stroke.dream');
    await createProject(strokePath, { width: 80, height: 60 });

    const result = await addStroke(strokePath, {
      points: [
        { x: 4, y: 5, pressure: 0.25 },
        { x: 30, y: 22, pressure: 0.8 },
      ],
      color: '#0af',
      size: 5,
      opacity: 0.75,
    });
    const doc = await loadProject(strokePath);
    const layer = doc.layers.find((candidate) => candidate.id === result.layerId);
    expect(result.layerName).toBe('Layer 1');
    expect(layer?.operations.find((candidate) => candidate.id === result.opId)).toMatchObject({
      kind: 'stroke',
      tool: 'brush',
      points: [
        { x: 4, y: 5 },
        { x: 30, y: 22 },
      ],
      widths: [0.25, 0.8],
      color: '#00aaff',
      size: 5,
      opacity: 0.75,
    });
  });

  it('add_stroke targets layers by id or name and preserves tool opacity semantics', async () => {
    const strokePath = join(dir, 'stroke-targets.dream');
    await createProject(strokePath, { width: 80, height: 60 });
    const ink = await addLayer(strokePath, { name: 'Ink' });
    const points = [
      { x: 1, y: 2 },
      { x: 8, y: 9 },
    ];

    const pencil = await addStroke(strokePath, {
      points,
      tool: 'pencil',
      opacity: 0.2,
      layer: 'Layer 1',
    });
    const eraser = await addStroke(strokePath, { points, tool: 'eraser', layer: ink.layerId });
    const doc = await loadProject(strokePath);
    expect(doc.layers[0].operations.find((op) => op.id === pencil.opId)).toMatchObject({
      tool: 'pencil',
      opacity: 1,
    });
    expect(doc.layers[1].operations.find((op) => op.id === eraser.opId)).toMatchObject({
      tool: 'eraser',
      opacity: 1,
    });
  });

  it('add_stroke validates every input class before writing', async () => {
    const strokePath = join(dir, 'stroke-errors.dream');
    await createProject(strokePath, { width: 80, height: 60 });
    const points = [
      { x: 1, y: 2 },
      { x: 8, y: 9 },
    ];

    await expect(addStroke(strokePath, { points: [points[0]!] })).rejects.toThrow('at least 2');
    await expect(
      addStroke(strokePath, { points: Array.from({ length: 10_001 }, () => points[0]!) }),
    ).rejects.toThrow('at most 10000');
    await expect(
      addStroke(strokePath, { points: [points[0]!, { x: Number.NaN, y: 3 }] }),
    ).rejects.toThrow('coordinates must be finite');
    await expect(
      addStroke(strokePath, { points: [points[0]!, { x: 3, y: 4, pressure: 1.1 }] }),
    ).rejects.toThrow('pressure must be between 0 and 1');
    await expect(addStroke(strokePath, { points, tool: 'spray' as 'brush' })).rejects.toThrow(
      'Invalid stroke tool',
    );
    await expect(addStroke(strokePath, { points, color: 'red' })).rejects.toThrow('Invalid color');
    await expect(addStroke(strokePath, { points, size: 0 })).rejects.toThrow('greater than 0');
    await expect(addStroke(strokePath, { points, size: 8193 })).rejects.toThrow('at most 8192');
    await expect(addStroke(strokePath, { points, opacity: -0.1 })).rejects.toThrow(
      'between 0 and 1',
    );
    await expect(addStroke(strokePath, { points, layer: 'missing' })).rejects.toThrow(
      'No layer with id or name "missing"',
    );
    expect((await loadProject(strokePath)).layers[0].operations).toHaveLength(0);
  });

  it('add_stroke writes through to the animated active-frame mirror', async () => {
    const strokePath = join(dir, 'stroke-animated.dream');
    await createProject(strokePath, { width: 80, height: 60 });
    await saveProject(strokePath, enableAnimation(await loadProject(strokePath)));

    await addStroke(strokePath, {
      points: [
        { x: 2, y: 3 },
        { x: 12, y: 14 },
      ],
    });
    const doc = await loadProject(strokePath);
    const activeFrame = doc.frames?.find((frame) => frame.id === doc.activeFrameId);
    expect(doc.layers).toEqual(activeFrame?.layers);
    expect(doc.layers[0].operations[0]).toMatchObject({ kind: 'stroke', tool: 'brush' });
  });

  it('add_shape appends a normalized shape to a named layer', async () => {
    const result = await addShape(projectPath, {
      shape: 'rectangle',
      x1: 8,
      y1: 9,
      x2: 70,
      y2: 50,
      size: 4,
      color: '#0af',
      opacity: 0.75,
      fill: true,
      layer: 'Agent shapes',
    });
    const doc = await loadProject(projectPath);
    const layer = doc.layers.find((candidate) => candidate.id === result.layerId);
    expect(layer?.operations.find((op) => op.id === result.opId)).toMatchObject({
      kind: 'shape',
      shape: 'rectangle',
      from: { x: 8, y: 9 },
      to: { x: 70, y: 50 },
      size: 4,
      color: '#00aaff',
      opacity: 0.75,
      fill: true,
    });
  });

  it('add_shape validates geometry, style and target layer', async () => {
    await expect(
      addShape(projectPath, { shape: 'line', x1: 1, y1: 1, x2: 1, y2: 1 }),
    ).rejects.toThrow('visible size');
    await expect(
      addShape(projectPath, { shape: 'ellipse', x1: 0, y1: 0, x2: 2, y2: 2, opacity: 2 }),
    ).rejects.toThrow('between 0 and 1');
    await expect(
      addShape(projectPath, {
        shape: 'line',
        x1: 0,
        y1: 0,
        x2: 2,
        y2: 2,
        layer: 'missing',
      }),
    ).rejects.toThrow('No layer with id or name "missing"');
  });

  it('render_png flattens the document to a real PNG', async () => {
    const outPath = join(dir, 'render.png');
    const result = await renderPng(projectPath, outPath);
    expect(result).toMatchObject({ width: 120, height: 80, frame: null });
    expect(result.bytes).toBeGreaterThan(0);
    const png = await readFile(outPath);
    expect(png.subarray(0, 4)).toEqual(PNG_MAGIC);
  });

  it('render_png applies the same editable layer adjustments as the app', async () => {
    const adjustedPath = join(dir, 'adjusted.dream');
    const outPath = join(dir, 'adjusted.png');
    await createProject(adjustedPath, { width: 10, height: 10 });
    await addShape(adjustedPath, {
      shape: 'rectangle',
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
      color: '#ff0000',
      fill: true,
    });
    await updateLayer(adjustedPath, {
      layer: 'Layer 1',
      adjustments: { grayscale: 100 },
    });
    await renderPng(adjustedPath, outPath);

    const png = await readFile(outPath);
    const decoded = await nodeRasterCodec.decode(`data:image/png;base64,${png.toString('base64')}`);
    const center = (5 * decoded.width + 5) * 4;
    expect([...decoded.data.slice(center, center + 4)]).toEqual([54, 54, 54, 255]);
  });

  it('render_png can pick a frame and errors without frames', async () => {
    await expect(renderPng(projectPath, join(dir, 'x.png'), { frame: 0 })).rejects.toThrow(
      'no frames',
    );
  });

  it('round-trips raster ops as real PNG payloads', async () => {
    const doc = await loadProject(projectPath);
    // Opaque pixels: canvas codecs premultiply alpha, which is lossy for
    // semi-transparent pixels (true for the browser codec too — the engine
    // round-trip test with a fake codec covers byte-exactness).
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 9, 8, 7, 255,
    ]);
    const fill: FillOp = {
      kind: 'fill',
      id: genId('op'),
      color: '#ff0000',
      opacity: 1,
      origin: { x: 1, y: 1 },
      patch: { x: 2, y: 3, width: 2, height: 2, data: pixels },
    };
    const stroke: StrokeOp = {
      kind: 'stroke',
      id: genId('op'),
      tool: 'brush',
      color: '#00ff00',
      opacity: 1,
      size: 5,
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
      ],
    };
    const withOps = appendOperation(
      appendOperation(doc, doc.layers[0].id, fill),
      doc.layers[0].id,
      stroke,
    );
    await saveProject(projectPath, withOps);

    // The payload on disk must be a PNG data URL, not raw bytes.
    const raw = await readFile(projectPath, 'utf8');
    expect(raw).toContain('data:image/png;base64,');

    const reloaded = await loadProject(projectPath);
    expect(reloaded).toEqual(withOps);
  });

  it('export_app writes a self-contained interactive HTML file', async () => {
    let doc = await loadProject(projectPath);
    doc = enableAnimation(doc);
    // A second frame with its own content, and a hotspot linking frame 1 → 2.
    const secondLayer = createLayer('Screen 2', [
      {
        kind: 'text',
        id: genId('op'),
        color: '#000000',
        opacity: 1,
        position: { x: 4, y: 4 },
        text: 'Screen two',
        fontSize: 16,
        fontFamily: 'sans-serif',
      },
    ]);
    doc = { ...doc, frames: [...doc.frames!, createFrame([secondLayer])] };
    doc = withFrameHotspots(doc, doc.frames![0].id, [
      {
        id: genId('hot'),
        rect: { x: 0, y: 0, width: 60, height: 30 },
        targetFrameId: doc.frames![1].id,
        transition: 'fade',
      },
    ]);
    await saveProject(projectPath, doc);

    const outPath = join(dir, 'app.html');
    const result = await exportApp(projectPath, outPath);
    expect(result).toMatchObject({ screens: 2, hotspots: 1 });
    const html = await readFile(outPath, 'utf8');
    expect(html).toContain('data-target="1"');
    expect(html).toContain('data:image/png;base64,');
    expect(html).toContain('Made with Dream');
  });

  it('export_app refuses a document without frames', async () => {
    const plain = join(dir, 'plain.dream');
    await createProject(plain, { width: 10, height: 10 });
    await expect(exportApp(plain, join(dir, 'plain.html'))).rejects.toThrow('needs frames');
  });

  it('load_project reports unreadable and corrupt files clearly', async () => {
    await expect(readProject(join(dir, 'missing.dream'))).rejects.toThrow('Cannot read');
    const bad = join(dir, 'bad.dream');
    await saveProjectBad(bad);
    await expect(readProject(bad)).rejects.toThrow('Not a .dream file');
  });
});

async function saveProjectBad(path: string) {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(path, '{"format":"other"}', 'utf8');
}
