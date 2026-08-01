# AGENTS.md

Conventions for anyone (human or agent) working on Dream.

## Stack

- Vite + React 18 + TypeScript (strict mode, `noUncheckedSideEffectImports`)
- Zustand for state, plain Canvas 2D for rendering (no canvas libraries — we own the engine)
- Vitest + @testing-library/react; `fake-indexeddb` for storage tests
- ESLint (typescript-eslint + react-hooks) + Prettier; plain CSS (no Tailwind, no UI kits)
- Persistence: IndexedDB via `idb`. No backend — everything is client-side.

## Commands

- `npm run dev` — dev server
- `npm run check` — typecheck + lint + test + build (must be green before committing)
- `npm run test:coverage` — engine coverage report (must stay ≥80% lines/functions/statements)
- `npm run format` — Prettier write; run before committing

## Architecture rules

1. **`src/engine` is framework-free and must stay unit-tested.** No DOM, no React,
   no imports from `store/`, `ui/`, or `storage/`. The renderer takes a 2D context
   (structural `Renderer2D` interface) so tests use a recording mock — never add a
   real-canvas dependency to engine tests.
2. Dependency direction: `ui/` → `store/` → `engine/`. `storage/` and `ai/` are
   leaves consumed by `ui/`/`store/`. Nothing in `engine/` knows the others exist.
3. **All document mutations go through `History` commands** (invertible `apply`/`revert`,
   no snapshots). If it changes the document, it must be undoable.
4. Document updates are immutable (structural sharing); never mutate an operation
   after it has been committed to a layer.
5. Keep diffs minimal. Match surrounding style. No speculative abstractions; three
   similar lines beat a premature helper.
6. No new runtime dependencies without a clear need — current set is intentionally
   tiny (`react`, `react-dom`, `zustand`, `idb`).

## Structure

- `src/engine/` — types, document, history, renderer, geometry, color, tools/
- `src/store/` — Zustand store(s)
- `src/ui/` — React components, hooks, icons, export helpers
- `src/storage/` — IndexedDB project persistence
- `src/ai/` — AIProvider interface, mock provider, registry (BYOK in later slices)
- `src/test/` — shared test helpers (mock 2D context) + Vitest setup

## Git

- CI (`.github/workflows/ci.yml`) runs `npm ci && npm run check` on Node 22 — keep it green.
- Commit messages: short imperative summary, e.g. "Dream: slice 2 — image filters".
