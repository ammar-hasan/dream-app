/**
 * End-to-end demo of the dream-mcp tool cores (no MCP client needed):
 * creates a .dream project in a tmp dir, adds vector marks and text, reads the
 * summary back and renders a flattened PNG. Run after `npm run build`:
 *
 *   node examples/demo.mjs
 */

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  addLayer,
  addShape,
  addStroke,
  addText,
  createProject,
  readProject,
  removeLayer,
  renderPng,
  updateLayer,
} from '../dist/mcp-server/src/tools.js';

const dir = await mkdtemp(join(tmpdir(), 'dream-mcp-demo-'));
const project = join(dir, 'hello-agent.dream');

console.log('1) dream.create_project');
console.log(
  await createProject(project, {
    width: 320,
    height: 180,
    background: '#1b2340',
    name: 'Hello agent',
  }),
);

console.log('\n2) dream.add_layer');
const artwork = await addLayer(project, { name: 'Agent draft' });
console.log(artwork);

console.log('\n3) dream.update_layer');
console.log(await updateLayer(project, { layer: artwork.layerId, name: 'Agent artwork' }));

console.log('\n4) dream.remove_layer');
const scratch = await addLayer(project, { name: 'Scratch' });
console.log(await removeLayer(project, scratch.layerId));

console.log('\n5) dream.add_shape');
console.log(
  await addShape(project, {
    shape: 'rectangle',
    x1: 14,
    y1: 14,
    x2: 306,
    y2: 166,
    size: 4,
    color: '#8fd3ff',
    layer: 'Agent artwork',
  }),
);

console.log('\n6) dream.add_stroke');
console.log(
  await addStroke(project, {
    points: [
      { x: 38, y: 128, pressure: 0.35 },
      { x: 72, y: 148, pressure: 0.65 },
      { x: 122, y: 112, pressure: 1 },
    ],
    color: '#ffb86b',
    size: 8,
    opacity: 0.9,
    layer: 'Agent artwork',
  }),
);

console.log('\n7) dream.add_text');
console.log(
  await addText(project, {
    text: 'Made by an agent via MCP',
    x: 24,
    y: 72,
    size: 20,
    color: '#ffffff',
    layer: 'Agent artwork',
  }),
);

console.log('\n8) dream.read_project');
console.log(await readProject(project));

console.log('\n9) dream.render_png');
console.log(await renderPng(project, join(dir, 'hello-agent.png')));

console.log(`\nDemo artifacts in ${dir}`);
