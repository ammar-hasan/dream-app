---
name: dogfood-mcp
description: Build and exercise Dream's own MCP server (dream-mcp) against a real .dream file — npm run check:mcp, the examples/demo.mjs round-trip, and a live tools smoke test. Use to verify the MCP surface works before wiring an agent to it, or after changing mcp-server/ or the engine API.
---

# Dogfood the dream-mcp server

Agents build Dream with Dream's own MCP server — so the server must actually
work end to end, not just compile. This skill proves it.

## Steps

1. **Build + test the package** (from the repo root):

   ```bash
   npm run check:mcp
   ```

   This installs `mcp-server/`'s own dependency tree, compiles the real
   engine in from `src/engine` (entry point:
   `mcp-server/dist/mcp-server/src/index.js` — nested because `rootDir` is
   the repo root) and runs its vitest suite.

2. **Run the demo** — the exact functions the MCP tools call, no client
   needed:

   ```bash
   node mcp-server/examples/demo.mjs
   ```

   It creates a project in a tmp dir, adds a layer, draws a shape, adds text,
   reads the summary and renders a PNG. It must exit 0 and print the rendered
   PNG path.

3. **Exercise the tools against a real `.dream` file.** Either reuse the
   demo's tmp project or make your own:

   ```bash
   node -e "
   (async () => {
     const { pathToFileURL } = await import('node:url');
     const t = await import(pathToFileURL('$PWD/mcp-server/dist/mcp-server/src/tools.js').href);
     const file = '/tmp/dogfood.dream';
     await t.createProject(file, { width: 160, height: 120, name: 'dogfood' });
     await t.addLayer(file, { name: 'Agent artwork' });
     await t.addShape(file, { shape: 'rectangle', x1: 4, y1: 4, x2: 156, y2: 116, color: '#6d7cff', layer: 'Agent artwork' });
     await t.addText(file, { text: 'Dream made this', x: 8, y: 60, size: 16, layer: 'Agent artwork' });
     console.log(JSON.stringify(await t.readProject(file), null, 2));
     console.log((await t.renderPng(file, '/tmp/dogfood.png')).outPath);
   })();
   "
   ```

   Expect: a summary listing one shape and one text op across two layers, and
   a non-empty `/tmp/dogfood.png` that opens as a 160×120 image with both.

4. **Check the client wiring.** `.mcp.json` at the repo root points MCP
   clients at the built server; it only works after step 1 has produced
   `mcp-server/dist/`. If you changed the tool list, update
   `mcp-server/README.md`'s table and the root docs that mention the tools
   (`README.md`, `AGENTS.md`, `docs/HARNESS.md`).

## Notes

- The webapp never imports `mcp-server/`; the server imports the ENGINE.
  Engine changes that alter the document model or renderer require a re-run
  of this skill.
- PNG round-trips of semi-transparent raster pixels are lossy by one
  rounding step (canvas premultiplied alpha) — known and documented, not a
  failure.
