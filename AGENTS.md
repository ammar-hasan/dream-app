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
- `npm run check:full` — `check` + Playwright e2e; run before releases and big PRs
- `npm run test:e2e` — e2e alone (builds + previews the production bundle)
- `npm run test:coverage` — engine coverage report (must stay ≥80% lines/functions/statements)
- `npm run icons` — regenerate the PWA PNG icons from `public/favicon.svg`
- `npm run release -- patch|minor|major` — clean-tree + green-check gate, bumps the
  version, seeds CHANGELOG.md, prints the git commands (never mutates git itself)
- `npm run format` — Prettier write; run before committing

## Architecture rules

1. **`src/engine` is framework-free and must stay unit-tested.** No DOM, no React,
   no imports from `store/`, `ui/`, or `storage/`. The renderer takes a 2D context
   (structural `Renderer2D` interface) so tests use a recording mock — never add a
   real-canvas dependency to engine tests.
2. Dependency direction: `ui/` → `store/` → `engine/`. `storage/` and `ai/` are
   leaves consumed by `ui/`/`store/`. Nothing in `engine/` knows the others exist.
3. **All document mutations go through `History` commands** (invertible `apply`/`revert`,
   no snapshots). If it changes the document, it must be undoable. (Exceptions,
   all document metadata updated outside history: the workspace `mode` field —
   undo must not flip the user's workspace — animation settings (`doc.animation`),
   and switching the active frame — undo must not teleport the user between
   frames. Frame add/duplicate/delete/reorder ARE undoable commands.)
4. Document updates are immutable (structural sharing); never mutate an operation
   after it has been committed to a layer.
5. **Frames**: `doc.frames` is optional; when present, `doc.layers` mirrors the
   ACTIVE frame's layer stack. Never write `doc.layers` directly — use the
   helpers in `engine/document.ts`, which write through to the owning frame
   (this is what makes cross-frame undo work).
6. Keep diffs minimal. Match surrounding style. No speculative abstractions; three
   similar lines beat a premature helper.
7. No new runtime dependencies without a clear need — current set is intentionally
   tiny (`react`, `react-dom`, `zustand`, `idb`).
8. **No literal user-visible UI strings outside the string tables.** All UI text
   goes through `t(key)` from `src/ui/i18n/` with an entry in `en.ts` (and every
   other locale — tests assert key parity). Voice/speech code is isolated in
   `src/ai/speech.ts` (recognition) and `src/ai/say.ts` (synthesis), both
   feature-detected.
9. **Styling goes through the design tokens in `src/styles/app.css`.** No
   hardcoded colors outside the `:root` / `[data-theme='dark']` token blocks —
   consume `var(--accent)`, `var(--panel)`, etc. Theme is a `data-theme`
   attribute on `<html>`, set from the uiPrefs store. Tooltips are pure CSS
   via a `data-tooltip` attribute (never native `title` on buttons; kid mode
   suppresses them because spoken names do that job). All animation is
   transform/opacity-only and must respect `prefers-reduced-motion`.

## Structure

- `src/engine/` — types, document, history, animation (frame model, playback
  timing, onion skin, sprite-sheet layout), renderer, geometry, color, filters
  (pure RGBA pixel transforms), transform (flip/rotate/crop/resize),
  selection (Design mode: hit-testing, move/scale/rotate, snapping, align,
  groups, component factories), tools/
- `src/store/` — Zustand store(s): `dreamStore` (document, via History) and
  `uiPrefs` (per-user UI prefs in localStorage: kid mode, voice toggles,
  locale, theme, recent colors)
- `src/ui/` — React components, hooks, icons, export helpers (image +
  animation video/sprite sheet; MediaRecorder isolated behind injectable deps),
  `i18n/` string tables (add a locale: copy `en.ts`, register in `i18n/index.ts`
  — see README), voice-command executor (`voiceExecutor.ts`, thin layer over
  the store, driven by a fake in tests)
- `src/storage/` — IndexedDB project persistence + cross-project component
  library (shared connection in `db.ts`)
- `src/ai/` — AIProvider contract (capability flags, PixelBuffer in/out — no
  DOM, so providers are Node-testable), MockAIProvider (built-in free tier),
  OpenAICompatibleProvider (BYOK; fetch + image decode are injectable deps),
  registry with settings persistence (API keys: sessionStorage by default,
  localStorage only on opt-in — never log keys), daily usage counter,
  rule-based document feedback (`analyze.ts`), Web Speech dictation
  (`speech.ts`, feature-detected), speech synthesis (`say.ts`,
  feature-detected), pure voice-command parser (`voiceCommands.ts`)
- `src/test/` — shared test helpers (mock 2D context) + Vitest setup
- `e2e/` — Playwright suite (smoke + one visual baseline). Vitest excludes it;
  Playwright's `testDir` points only here. Screenshots are asserted with
  generous thresholds — regenerate with `--update-snapshots` after intended
  UI changes.
- `scripts/` — `gen-icons.mjs` (PWA PNGs via chromium, no image deps) and
  `release.mjs` (release prep; prints git commands, never runs them)

## Git

- CI (`.github/workflows/ci.yml`) runs `npm ci && npm run check` on Node 22 — keep it
  green. A separate `e2e` job runs the Playwright suite and uploads
  `playwright-report` on failure. `.github/workflows/deploy.yml` publishes
  `dist/` to GitHub Pages on every push to `main` (base `/dream-app/`).
- Releases: `npm run release -- patch|minor|major`, fill in the CHANGELOG
  bullets, then run the git commands the script prints (it never commits,
  tags or pushes itself).
- Commit messages: short imperative summary, e.g. "Dream: slice 2 — image filters".
