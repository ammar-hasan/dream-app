/**
 * End-to-end demo of the dream-mcp tool cores (no MCP client needed):
 * creates a .dream project in a tmp dir, adds text, reads the summary back
 * and renders a flattened PNG. Run after `npm run build`:
 *
 *   node examples/demo.mjs
 */

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addText, createProject, readProject, renderPng } from '../dist/mcp-server/src/tools.js';

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

console.log('\n2) dream.add_text');
console.log(
  await addText(project, {
    text: 'Made by an agent via MCP',
    x: 24,
    y: 72,
    size: 20,
    color: '#8fd3ff',
  }),
);

console.log('\n3) dream.read_project');
console.log(await readProject(project));

console.log('\n4) dream.render_png');
console.log(await renderPng(project, join(dir, 'hello-agent.png')));

console.log(`\nDemo artifacts in ${dir}`);
