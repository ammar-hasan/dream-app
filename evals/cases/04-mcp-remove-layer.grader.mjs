/**
 * Grader for eval 04 — a working dream.remove_layer MCP tool.
 * Static checks first; then a real build + behavioral run of the BUILT
 * tool core against a tmp .dream file (create → add a layer → remove it →
 * assert the last layer is refused).
 */
export async function grade(ctx) {
  const reasons = [];

  if (!ctx.grep('mcp-server/src/tools.ts', /export async function removeLayer\(/)) {
    reasons.push('mcp-server/src/tools.ts does not export removeLayer');
  }
  const index = ctx.read('mcp-server/src/index.ts') ?? '';
  const mentions = (index.match(/dream\.remove_layer/g) ?? []).length;
  if (mentions < 3) {
    reasons.push(
      `mcp-server/src/index.ts mentions dream.remove_layer ${mentions} time(s) — ` +
        'expected ≥3 (tool definition, args schema, dispatch)',
    );
  }
  if (!ctx.grep('mcp-server/README.md', /dream\.remove_layer/)) {
    reasons.push('mcp-server/README.md tools table does not document dream.remove_layer');
  }
  if (!/removeLayer/.test(ctx.read('mcp-server/src/tools.test.ts') ?? '')) {
    reasons.push('mcp-server/src/tools.test.ts was not updated to cover removeLayer');
  }

  if (reasons.length > 0) return { pass: false, reasons };

  const build = ctx.run('npm', ['--prefix', 'mcp-server', 'run', 'build']);
  if (!build.ok) {
    return {
      pass: false,
      reasons: [...reasons, `mcp-server build failed:\n${tail(build.output)}`],
    };
  }

  const behavior = ctx.run('node', [
    '-e',
    behaviorScript(ctx.abs('mcp-server/dist/mcp-server/src/tools.js')),
  ]);
  if (!behavior.ok) {
    reasons.push(`behavioral check failed:\n${tail(behavior.output)}`);
  }

  const vitest = ctx.run('npx', ['vitest', 'run', 'src/tools.test.ts'], {
    cwd: ctx.abs('mcp-server'),
  });
  if (!vitest.ok) {
    reasons.push(`mcp-server tools tests failed:\n${tail(vitest.output)}`);
  }
  return { pass: reasons.length === 0, reasons };
}

/**
 * Plain CJS (node -e): import the built tools, drive a real .dream file.
 * Exits non-zero with a message on any assertion failure.
 */
function behaviorScript(toolsPath) {
  const toolsUrl = 'file://' + toolsPath;
  return `
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const tools = await import(${JSON.stringify(toolsUrl)});
  if (typeof tools.removeLayer !== 'function') throw new Error('built tools.js has no removeLayer export');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dream-eval-04-'));
  const file = path.join(dir, 'case.dream');
  await tools.createProject(file, { width: 32, height: 32 });
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const first = doc.document.layers[0];
  doc.document.layers.push({ ...first, id: 'layer-under-test', name: 'Second' });
  fs.writeFileSync(file, JSON.stringify(doc));
  await tools.removeLayer(file, 'layer-under-test');
  const after = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (after.document.layers.length !== 1 || after.document.layers[0].id !== first.id) {
    throw new Error('removeLayer did not remove exactly the requested layer');
  }
  let refused = false;
  try {
    await tools.removeLayer(file, first.id);
  } catch {
    refused = true;
  }
  if (!refused) throw new Error('removeLayer deleted the LAST layer — it must refuse');
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
