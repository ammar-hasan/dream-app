/** Grader for a working dream.import_raster MCP authoring tool. */
export async function grade(ctx) {
  const reasons = [];

  if (!ctx.grep('mcp-server/src/tools.ts', /export async function importRaster\(/)) {
    reasons.push('mcp-server/src/tools.ts does not export importRaster');
  }
  const index = ctx.read('mcp-server/src/index.ts') ?? '';
  const mentions = (index.match(/dream\.import_raster/g) ?? []).length;
  if (mentions < 3) {
    reasons.push(
      `mcp-server/src/index.ts mentions dream.import_raster ${mentions} time(s) — ` +
        'expected ≥3 (tool definition, args schema, dispatch)',
    );
  }
  if (!ctx.grep('mcp-server/README.md', /dream\.import_raster/)) {
    reasons.push('mcp-server/README.md does not document dream.import_raster');
  }
  if (!/importRaster/.test(ctx.read('mcp-server/src/tools.test.ts') ?? '')) {
    reasons.push('mcp-server/src/tools.test.ts was not updated to cover importRaster');
  }
  if (!ctx.grep('spec/integrations.md', /dream\.import_raster/)) {
    reasons.push('the living integration spec does not define dream.import_raster');
  }

  if (reasons.length > 0) return { pass: false, reasons };

  const build = ctx.run('npm', ['--prefix', 'mcp-server', 'run', 'build']);
  if (!build.ok) {
    return { pass: false, reasons: [`mcp-server build failed:\n${tail(build.output)}`] };
  }

  const behavior = ctx.run('node', [
    '-e',
    behaviorScript(ctx.abs('mcp-server/dist/mcp-server/src/tools.js')),
  ]);
  if (!behavior.ok) reasons.push(`behavioral check failed:\n${tail(behavior.output)}`);

  const vitest = ctx.run('npx', ['vitest', 'run', 'src/tools.test.ts'], {
    cwd: ctx.abs('mcp-server'),
  });
  if (!vitest.ok) reasons.push(`mcp-server tools tests failed:\n${tail(vitest.output)}`);
  return { pass: reasons.length === 0, reasons };
}

function behaviorScript(toolsPath) {
  const toolsUrl = 'file://' + toolsPath;
  return `
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const tools = await import(${JSON.stringify(toolsUrl)});
  if (typeof tools.importRaster !== 'function') throw new Error('built tools.js has no importRaster export');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dream-eval-04-'));
  const file = path.join(dir, 'case.dream');
  const png = path.join(dir, 'pixel.png');
  fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAABHNCSVQICAgIfAhkiAAAAAFzUkdCAK7OHOkAAAAUSURBVAiZY6yxevufgYGBgYkBCgAn5wKm8Nhy+QAAAABJRU5ErkJggg==', 'base64'));
  await tools.createProject(file, { width: 64, height: 48 });
  const result = await tools.importRaster(file, { source: png, x: 7, y: 9, name: 'Reference' });
  const doc = await tools.loadProject(file);
  const layer = doc.layers.find((candidate) => candidate.id === result.layerId);
  const op = layer && layer.operations.find((candidate) => candidate.id === result.opId);
  if (!op || op.kind !== 'image' || result.width !== 2 || result.height !== 2) {
    throw new Error('importRaster did not persist the expected Dream image');
  }
  console.log('behavioral check OK');
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
`;
}

function tail(output) {
  return output.trim().split('\n').slice(-25).join('\n');
}
