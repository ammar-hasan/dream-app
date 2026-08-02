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
- `npm run check:mcp` — install, build and test the `mcp-server/` package
  (separate dependency tree; root `check` never touches it)
- `npm run release -- patch|minor|major` — clean-tree + green-check gate, bumps the
  version, seeds CHANGELOG.md, prints the git commands (never mutates git itself)
- `npm run format` — Prettier write; run before committing

## Architecture rules

1. **`src/engine` is framework-free and must stay unit-tested.** No DOM, no React,
   no imports from `store/`, `ui/`, or `storage/`. The renderer takes a 2D context
   (structural `Renderer2D` interface) so tests use a recording mock — never add a
   real-canvas dependency to engine tests.
2. Dependency direction: `ui/` → `store/` → `engine/`. `storage/`, `ai/` and
   `game/` are leaves consumed by `ui/`/`store/`. Nothing in `engine/` knows
   the others exist; `game/` may use `engine/` but stays DOM-free too.
3. **All document mutations go through `History` commands** (invertible `apply`/`revert`,
   no snapshots). If it changes the document, it must be undoable. (Exceptions,
   all document metadata updated outside history: the workspace `mode` field —
   undo must not flip the user's workspace — animation settings (`doc.animation`),
   Play-mode casting + settings (`doc.game`) — undo must not re-cast your game —
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
10. **`mcp-server/` is a standalone package.** It has its own package.json,
    tsconfig, dependency tree and test runner. The webapp never imports it;
    it imports the ENGINE only (compiled from `src/engine` at its build
    time), and the engine stays dependency-free — `@napi-rs/canvas` lives in
    mcp-server alone, plugged into the engine via `RenderOptions` and the
    `RasterCodec` interface. Root `npm run check` must not build it (eslint,
    vitest and tsconfig all exclude it); its gate is `npm run check:mcp`.
    Tool cores stay pure functions over the file system; the MCP protocol
    wiring stays a thin adapter.
11. **The service worker (`public/sw.js`) is hand-rolled and build-injected.**
    No vite-plugin-pwa; the `dreamServiceWorker` plugin in `vite.config.ts`
    writes the precache manifest + hashed cache name into `dist/sw.js`.
    Caching rules: precache the shell only; cache-first ONLY for same-origin
    GET requests; navigations network-first with cached-index fallback;
    non-GET and cross-origin requests (AI provider APIs) must never touch
    the cache. `skipWaiting` only on user action (the update toast posts
    `DREAM_SKIP_WAITING`). Engine code and unit tests never touch the
    worker — registration lives in `src/ui/pwa.ts` behind injectable
    fakes, runs only under `import.meta.env.PROD`, and offline behavior is
    verified by `e2e/offline.spec.ts` (a real killed server, not network
    emulation).

## Structure

- `src/engine/` — types, document, history, animation (frame model, playback
  timing, onion skin, sprite-sheet layout), hotspots (app-mode links:
  broken-target detection, hit-testing), appExport (standalone interactive
  HTML prototype generator — pure string builder), projectFile (the `.dream`
  file format: JSON envelope + raster patches as base64 PNG data URLs, via an
  injectable `RasterCodec`), layerCache (incremental compositor: per-layer
  bitmap cache, reference-equality invalidation, eraser-aware snapshot
  fallback, LRU + pixel caps), index (the public API barrel — semver-intended
  stable surface), renderer, geometry, color, filters
  (pure RGBA pixel transforms), transform (flip/rotate/crop/resize), symmetry
  (mirror-mode op reflection), spray (seeded dot layout), selection (Design
  mode: hit-testing, lasso/marquee, move/scale/rotate, snapping, align,
  groups, component factories), tools/
- `src/store/` — Zustand store(s): `dreamStore` (document, via History) and
  `uiPrefs` (per-user UI prefs in localStorage: kid mode, voice toggles,
  locale, theme, recent colors)
- `src/game/` — Play mode ("Catch!"), framework-free like the engine: the
  pure game core (`core.ts`: entities, spawn/collision/score, difficulty
  ramp, seeded `tick`), sprite content-cropping (`sprites.ts`), procedural
  default cast drawings (`defaults.ts`), tiny WebAudio bleeps (`sounds.ts`,
  feature-detected). No DOM, no React, no store imports.
- `src/ui/` — React components, hooks, icons, export helpers (image +
  animation video/sprite sheet + app prototype HTML; MediaRecorder isolated
  behind injectable deps), app-mode pieces (LinkDialog, HotspotsPanel,
  PresentView's Slideshow/App toggle),
  `i18n/` string tables (add a locale: copy `en.ts`, register in `i18n/index.ts`
  — see README), voice-command executor (`voiceExecutor.ts`, thin layer over
  the store, driven by a fake in tests), PWA glue (`pwa.ts` — production-only
  SW registration behind injectable fakes, `UpdateToast.tsx` — the
  version-update prompt)
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
- `e2e/` — Playwright suite (smoke + one visual baseline + the offline PWA
  boot test, which serves `dist/` from its own throwaway server and kills
  it — network emulation breaks SW-intercepted subresources in Chromium).
  Vitest excludes it; Playwright's `testDir` points only here. Screenshots
  are asserted with generous thresholds — regenerate with
  `--update-snapshots` after intended UI changes.
- `scripts/` — `gen-icons.mjs` (PWA PNGs via chromium, no image deps) and
  `release.mjs` (release prep; prints git commands, never runs them)
- `mcp-server/` — standalone Node package: the dream-mcp stdio MCP server
  over `.dream` files. Thin protocol wiring (`src/index.ts`) over pure tool
  cores (`src/tools.ts`, tested in tmp dirs) + the Node raster codec/frame
  renderer (`src/nodeCodec.ts`, `@napi-rs/canvas`). Compiles the engine in
  from `src/engine`; never imported by the webapp; gated by `check:mcp` and
  its own CI job.

## Git

- CI (`.github/workflows/ci.yml`) runs `npm ci && npm run check` on Node 22 — keep it
  green. Separate jobs run the Playwright suite (report uploaded on failure)
  and the `mcp-server/` package check (`npm ci && npm run check` inside
  `mcp-server/`). `.github/workflows/deploy.yml` publishes
  `dist/` to GitHub Pages on every push to `main` (base `/dream-app/`).
- Releases: `npm run release -- patch|minor|major`, fill in the CHANGELOG
  bullets, then run the git commands the script prints (it never commits,
  tags or pushes itself).
- Commit messages: short imperative summary, e.g. "Dream: slice 2 — image filters".
