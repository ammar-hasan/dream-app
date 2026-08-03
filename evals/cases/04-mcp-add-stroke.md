# Eval 04 — Add a `dream.add_stroke` MCP tool

Difficulty: ★★★★ (standalone package, document geometry + protocol wiring)

## Task

The `mcp-server/` package exposes `.dream` files to agents over stdio MCP. Add
**`dream.add_stroke`** so an agent can append an ordinary freehand mark to a
layer in the active frame.

Requirements:

- Read `AGENTS.md` rule 10 and `mcp-server/README.md` first.
- Add a pure file-system tool core in `mcp-server/src/tools.ts` named
  `addStroke`. It accepts `path` plus: `points` (2–10,000 finite `{x, y}`
  points with optional pressure 0–1), optional `tool` (`brush`, `pencil` or
  `eraser`, default `brush`), `color`, `size`, `opacity`, and target `layer`
  id/name (default top layer). Validate all bounds before writing.
- Store a normal Dream stroke operation using the real engine helpers. Return
  the operation id and target layer facts, matching the other authoring tools.
- Wire `dream.add_stroke` through the tool definition, JSON Schema, runtime
  validation and dispatch in `mcp-server/src/index.ts`.
- Cover a successful pressure stroke, id/name layer targeting and every invalid
  input class in `mcp-server/src/tools.test.ts`.
- Document the tool in `mcp-server/README.md` and the living integration spec.
- Done when `npm run check:mcp` is green. Do not commit.

## Grader

The deterministic grader checks core/wiring/docs/test evidence, builds the
standalone package, drives the built core against a real `.dream` file and
asserts the persisted stroke, then runs the MCP test suite. No network, clock
or LLM judging.
