/** Grader for a working dream.add_stroke MCP authoring tool. */
export async function grade(ctx) {
  const reasons = [];

  if (!ctx.grep('mcp-server/src/tools.ts', /export async function addStroke\(/)) {
    reasons.push('mcp-server/src/tools.ts does not export addStroke');
  }
  const index = ctx.read('mcp-server/src/index.ts') ?? '';
  const mentions = (index.match(/dream\.add_stroke/g) ?? []).length;
  if (mentions < 3) {
    reasons.push(
      `mcp-server/src/index.ts mentions dream.add_stroke ${mentions} time(s) — ` +
        'expected ≥3 (tool definition, args schema, dispatch)',
    );
  }
  if (!ctx.grep('mcp-server/README.md', /dream\.add_stroke/)) {
    reasons.push('mcp-server/README.md does not document dream.add_stroke');
  }
  if (!/addStroke/.test(ctx.read('mcp-server/src/tools.test.ts') ?? '')) {
    reasons.push('mcp-server/src/tools.test.ts was not updated to cover addStroke');
  }
  if (!ctx.grep('spec/integrations.md', /dream\.add_stroke/)) {
    reasons.push('the living integration spec does not define dream.add_stroke');
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
  if (typeof tools.addStroke !== 'function') throw new Error('built tools.js has no addStroke export');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dream-eval-04-'));
  const file = path.join(dir, 'case.dream');
  await tools.createProject(file, { width: 64, height: 48 });
  const result = await tools.addStroke(file, {
    points: [{ x: 4, y: 5, pressure: 0.25 }, { x: 30, y: 22, pressure: 0.8 }],
    color: '#00aaff', size: 5, opacity: 0.75
  });
  const doc = await tools.loadProject(file);
  const layer = doc.layers.find((candidate) => candidate.id === result.layerId);
  const op = layer && layer.operations.find((candidate) => candidate.id === result.opId);
  if (!op || op.kind !== 'stroke' || op.points.length !== 2 || op.color !== '#00aaff') {
    throw new Error('addStroke did not persist the expected Dream stroke');
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
