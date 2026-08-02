---
name: implement-slice
description: The proven Dream slice workflow — read conventions, smallest diff, tests alongside, npm run check green, hand off uncommitted. Use when asked to implement a roadmap slice, backlog item or any non-trivial feature in this repo.
---

# Implement a Dream slice

The workflow that built slices 1–16. It works because it front-loads
conventions and back-loads verification, keeping every diff small enough to
review in one sitting.

## Steps

1. **Read the contract.** `AGENTS.md` first (architecture rules are
   non-negotiable), then the slice's acceptance criteria in `ROADMAP.md`, then
   the closest existing module AND its test file. If the slice touches the
   engine's public API, also read `src/engine/index.ts`.
2. **Pick the layer.** Engine/game/ai logic goes in framework-free
   `src/engine/`, `src/game/`, `src/ai/` (no DOM, no React — inject
   dependencies). UI goes in `src/ui/` through `t(key)` string tables and
   design tokens. Document mutations are invertible `History` commands;
   `doc.layers` is only written via the helpers in `engine/document.ts`.
3. **Tests alongside.** Every new behavior gets a test in the neighboring
   `*.test.ts` (recording mock 2D context for the engine, fake stores for
   executors, `fake-indexeddb` for storage). New i18n keys go in BOTH
   `en.ts` and `ar.ts` — parity is test-enforced.
4. **Smallest diff.** No drive-by refactors, no speculative abstractions, no
   new runtime dependencies. Three similar lines beat a premature helper.
5. **Verify.** `npx vitest run <touched test files>` as you go, then the full
   gate: `npm run check` green. UI behavior changes: also `npm run test:e2e`
   (see the verify-release skill for the visual-baseline rules). Engine
   public-API or `mcp-server/` changes: also `npm run check:mcp`.
6. **Document.** Update the docs the slice touches: `README.md` (feature
   section), `ROADMAP.md` (acceptance boxes ticked, deviations noted),
   `CHANGELOG.md` Unreleased, and `AGENTS.md` if conventions moved.
7. **Hand off uncommitted.** Never commit unless explicitly asked. Report:
   files changed, deviations from the acceptance criteria, gate results, and
   anything left open (e.g. a visual baseline that needs regenerating).
