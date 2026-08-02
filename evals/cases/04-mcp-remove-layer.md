# Eval 04 — Add a `dream.remove_layer` MCP tool

Difficulty: ★★★★ (standalone package, protocol wiring + pure core + behavioral test)

## Task

The `mcp-server/` package exposes `.dream` files to agents over stdio MCP.
Its tools today: `dream.read_project`, `dream.create_project`,
`dream.list_layers`, `dream.add_text`, `dream.render_png`,
`dream.export_app`. Add a seventh:

- **`dream.remove_layer`** — remove a layer from the active frame's stack.

Requirements:

- Read `AGENTS.md` (rule 10: `mcp-server/` is standalone) and
  `mcp-server/README.md` first.
- Tool core in `mcp-server/src/tools.ts`:
  `export async function removeLayer(projectPath: string, layer: string)`,
  where `layer` is a layer id or name (same lookup convention as
  `addText`). It must REFUSE to delete the document's last remaining layer
  (throw a clear error). Write through `loadProject`/`saveProject` like the
  other cores; keep it a pure function over the file system.
- Wire it in `mcp-server/src/index.ts`: tool definition (name, description,
  JSON Schema with required `path` and `layer`), the zod args schema, and
  the dispatch switch — same shape as the existing tools.
- Tests in `mcp-server/src/tools.test.ts` (tmp dirs, like the others):
  removing by id and by name, error on unknown layer, error when removing
  the last layer.
- Document it in the `mcp-server/README.md` tools table.
- Done when `npm run check:mcp` is green (root `npm run check` never touches
  this package). Do not commit.

## Grader

Deterministic, in `04-mcp-remove-layer.grader.mjs`:

1. `tools.ts` exports `removeLayer`; `index.ts` mentions `dream.remove_layer`
   in the tool list, the args schema and the dispatch (≥3 occurrences);
   `mcp-server/README.md` documents it; `tools.test.ts` covers it.
2. Runtime: `npm --prefix mcp-server run build` succeeds, then a behavioral
   check runs the BUILT tool core against a real `.dream` file in a tmp dir:
   create a project, hand-add a second layer, `removeLayer` it by id
   (assert it's gone), then attempt to remove the last layer (assert it
   throws).
3. `npx vitest run src/tools.test.ts` passes inside `mcp-server/`.

Plus the shared gate: `npm run check` must pass (it must stay green — the
webapp must remain untouched).
