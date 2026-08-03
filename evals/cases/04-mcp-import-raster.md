# Eval 04 — Add a `dream.import_raster` MCP tool

Difficulty: ★★★★ (standalone package, binary image input + protocol wiring)

## Task

The `mcp-server/` package exposes `.dream` files to agents over stdio MCP. Add
**`dream.import_raster`** so an agent can place an existing PNG into a layer in
the active frame.

Requirements:

- Read `AGENTS.md` rule 10 and `mcp-server/README.md` first.
- Add a pure file-system tool core in `mcp-server/src/tools.ts` named
  `importRaster`. It accepts the project `path` plus `source` (a local PNG path
  or PNG data URL), optional finite `x`/`y`, optional target `layer` id/name
  (default top layer), and optional operation `name`. Decode and validate the
  complete source before writing.
- Store a normal Dream image operation through the standalone Node raster codec.
  Return the operation id, decoded dimensions and target layer facts, matching
  the other authoring tools.
- Wire `dream.import_raster` through the tool definition, JSON Schema, runtime
  validation and dispatch in `mcp-server/src/index.ts`.
- Cover local-file and data-URL success, id/name layer targeting, invalid image,
  invalid coordinates and missing-target no-write behavior in
  `mcp-server/src/tools.test.ts`.
- Document the tool in `mcp-server/README.md` and the living integration spec.
- Done when `npm run check:mcp` is green. Do not commit.

## Grader

The deterministic grader checks core/wiring/docs/test evidence, builds the
standalone package, drives the built core against a real PNG and `.dream` file,
asserts the persisted image operation, then runs the MCP tool tests. No network,
clock or LLM judging.
