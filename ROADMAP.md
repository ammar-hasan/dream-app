# Roadmap

Dream ships in slices. Slice 1 (core drawing app + harness), slice 2 (image
editing), slice 3 (design mode), slice 4 (animation + video export +
presentation mode), slice 7 (AI panel), the accessibility trio — slices 8
(voice commands), 9 (kid mode) and 10 (i18n) — the release harness, the
drawing power tools (symmetry, pressure, filled shapes, lasso, magic wand,
spray), game mode v1 (Catch!, the first slice-12 template), app mode v1
(interactive prototypes: hotspots, app preview, standalone HTML export) and
the developer surface (.dream project files, the dream-mcp server, the stable
engine API) are done. Each slice below lists brief acceptance criteria; slices
are roughly ordered by dependency, not by a fixed schedule.

## Slice 2 — Image filters & adjustments ✅

- ✅ Import an image onto a layer (file picker / drag-drop / paste) — centered,
  scaled down to fit, pixels survive the IndexedDB round-trip.
- ✅ Per-layer raster filters: brightness, contrast, saturation, hue, grayscale,
  sepia, invert, blur (box) and sharpen (3x3 kernel) — pure functions in
  `engine/filters.ts` with unit tests on synthetic pixel buffers.
- ✅ Live preview on a scratch canvas; Apply bakes one undoable raster command
  (RasterPatch-style, like flood fill), Cancel discards. Presets: B&W, Vintage,
  Cool, Warm.
- ✅ Move tool for layer content; per-layer flip H/V and rotate 90° CW/CCW;
  crop tool (whole document) and resize dialog (scale-to-fit, nearest sampling).
- ✅ Export flattened PNG or JPEG (quality setting), including imported images
  and filter results.
- Deviation from the original note: applied filters are baked into a single
  raster op (undoable, like Photoshop's destructive apply) rather than kept as a
  reorderable filter stack — simpler and consistent with the baked fill model.

## Slice 3 — Design mode: layers, components & selection ✅

- ✅ Draw / Design mode switch in the toolbar, persisted per project; Draw mode
  is untouched, Design mode reveals the Select tool (V), the Design panel and
  the Components panel.
- ✅ Select tool: click / shift-click / rubber-band marquee selection of
  individual ops on the active layer (engine hit-testing per op kind);
  bounding box with handles; move, uniform scale (corner handles) and rotate
  (top handle); Del, Cmd/Ctrl+D duplicate, bring forward / send backward,
  arrow-key nudge (Shift = 10px) — all undoable.
- ✅ Snapping while dragging: canvas center/edges and other objects'
  edges/centers, with accent guide lines; toggleable (default on).
- ✅ Group/ungroup as `groupId` metadata on ops (no scene graph); align
  left/center/right/top/middle/bottom and distribute horizontally/vertically.
- ✅ Component library in IndexedDB (cross-project): create from selection,
  thumbnail grid, rename/delete, double-click or drag to insert an instance
  as a new layer.
- Deviations from the original note: **instances are copies, not linked
  masters** (editing a component does not update placed instances — the
  MS-Paint-simple model; linked masters can come later), and arbitrary-angle
  rotation applies to strokes/lines/text only — selections containing
  rectangles, ellipses or raster ops rotate in 90° steps. Both decisions are
  documented in the README and `engine/selection.ts`.

## Slice 4 — Animation timeline, video export & presentation mode ✅

- ✅ Frame-by-frame animation (flipbook model, not a pro timeline): the
  Animate toolbar toggle wraps the current layers in frame 1; the timeline
  bar shows big live thumbnails with add/duplicate/delete/reorder, all
  undoable through the same per-document History. `doc.layers` mirrors the
  active frame's stack, so renderer/tools/persistence never learned about
  frames.
- ✅ Onion skinning (previous frame ghosted, configurable opacity ~30%
  default, optional next frame), play/pause in the main viewport, FPS 1–24
  (default 6), loop toggle. Space toggles play only when the timeline has
  focus; hold-to-pan is untouched everywhere else.
- ✅ Video export: WebM via `canvas.captureStream()` + `MediaRecorder`
  (VP9 → VP8 → bare WebM fallback), progress in the dialog, plus a PNG
  sprite sheet (grid layout math in `engine/animation.ts`). **GIF skipped** —
  it needs an encoder dependency; sprite sheet is the zero-dep animated asset.
- ✅ Presentation mode: third workspace mode — frames act as slides,
  full-viewport rendering, arrows/Space/click to advance, Esc exits to the
  previous workspace, slide counter. Session-only (reopens in Draw).
- ✅ Persistence: frames + animation settings survive IndexedDB autosave;
  old documents load with animation off (schema is purely additive).
- Acceptance: the 12-frame bouncing-ball loop works — draw, duplicate frames,
  onion-skin the in-betweens, play at 6 fps, export WebM or sprite sheet.
- Deviations from the original note: slices 4–6 were merged into one slice
  (a presentation IS the frame model stepped through manually). Crop/resize
  apply to EVERY frame. Slice 5's optional audio track and Slice 6's
  transitions/presenter view remain open (below).

## Slice 5 — Video export (remainder)

- ✅ WebM export shipped in slice 4 (MediaRecorder, VP9/VP8 fallback).
- Remaining: optional audio track; MP4/WebCodecs path for players that
  don't support WebM.

## Slice 6 — Presentation mode (remainder)

- ✅ Basic deck shipped in slice 4 (frames as slides, keyboard/click
  navigation, fullscreen, slide counter).
- Remaining: transitions, presenter view with notes, per-slide duration.

## Slice 7 — AI panel with BYOK providers ✅

- ✅ AI panel (sparkle in the toolbar, `A` key): three friendly tabs —
  Create (prompt → new layer), Edit (prompt → layer edit, optional
  selected-area-only region from the Design-mode selection box) and
  Feedback (observations + one-click Apply suggestions). All actions are
  undoable through the shared History.
- ✅ Provider architecture in `src/ai`: capability-flagged `AIProvider`
  (generateImage/editImage/chat, PixelBuffer in/out), the built-in
  **Dream AI** mock (deterministic procedural scenes seeded by the prompt,
  keyword→filter edits, rule-engine feedback over the real document), and
  `OpenAICompatibleProvider` for BYOK (`/chat/completions` +
  `/images/generations`, graceful degradation when an endpoint can't do
  images; no shared edits API → edit capability declared false).
- ✅ BYOK settings persisted locally (base URL, model, active provider);
  API keys in sessionStorage by default with an opt-in "remember key"
  (localStorage); keys never logged. Test-connection button with friendly
  errors.
- ✅ Free tier: 20 Dream AI tries/day with date rollover, shown subtly in
  the panel; the counter disappears with BYOK (unlimited).
- ✅ Voice input for the prompt boxes via the Web Speech API (isolated in
  `ai/speech.ts` with feature detection; mic button hidden when
  unsupported).
- Acceptance: user enters an API key, generates an image onto a layer, asks
  for feedback and gets actionable suggestions; provider errors degrade
  gracefully.
- Deviation: image _editing_ on BYOK providers was skipped (no shared
  `/images/edits` API across OpenAI-compatible endpoints); Dream AI covers
  edits, and the Edit tab says so kindly when BYOK can't.

## Slice 8 — Voice commands ✅

- ✅ Prompt dictation shipped with the AI panel (mic button, Web Speech API).
- ✅ Hands-free canvas commands via the toolbar mic: "undo", "redo", "clear"
  (spoken yes/no confirmation before wiping the active layer), "new frame"
  (enables animation when needed), "play"/"stop", tool names ("brush",
  "eraser", "fill", shapes…), a friendly color vocabulary ("red", "blue",
  "fill red"), "bigger"/"smaller" brush sizes, "save" and "help" (speaks the
  command list). Pure parser in `ai/voiceCommands.ts` (case-insensitive,
  filler-tolerant) + thin executor in `ui/voiceExecutor.ts` against a minimal
  store interface; feedback is shown in the toolbar and spoken aloud when
  voice feedback is on (default in kid mode, toggleable for adults).
- ✅ Graceful degradation: the mic button hides where SpeechRecognition is
  unsupported, and mic-permission denial gets a friendly message.
- Deviation: the command vocabulary is English-only for now — the parser is
  deliberately a dumb keyword matcher, so localized vocabularies can be
  added per locale later without touching the executor.

## Slice 9 — Kid mode ✅

- ✅ "Little Dreamer" mode (⭐ in the toolbar or the settings gear, per-user
  in localStorage): giant icon-only tool rail with just the essentials, a
  12-color bright named palette, three brush sizes as dots, a simplified
  right panel (big Undo/Redo, "Ask Dream!" Create tab with a giant mic,
  play button when frames exist). No dialogs that require reading.
- ✅ Spoken tool names on hover/focus/touch ("Brush!") via speech synthesis
  (`ai/say.ts`, feature-detected) — on by default in kid mode, toggleable
  for adults in the settings menu.
- ✅ Entering kid mode lands in Draw mode with a visible tool; the adult UI
  is 100% unchanged and one toggle away.
- Acceptance: a 5-year-old can pick a color and draw with zero literacy;
  toggle is one tap from the toolbar.

## Slice 10 — i18n & accessibility ✅

- ✅ String externalization: every user-visible UI string lives in
  `ui/i18n/en.ts` and renders through `t(key)` (variable interpolation,
  English fallback, key fallback). No library.
- ✅ Complete Arabic (`ar`) locale proving the pipeline, with RTL: the root
  gets `dir="rtl"`/`lang` and the layout uses CSS logical properties so the
  shell mirrors. Locale picker in the settings menu, persisted per user.
  Adding a locale is documented in the README.
- ✅ Settings menu (gear in the toolbar) consolidating Little Dreamer mode,
  speak-tool-names, voice feedback and the language picker.
- ✅ Accessibility pass: aria-labels on every toolbar/rail button (from the
  string table), `:focus-visible` outlines, keyboard tool switching intact.
- Remaining: more locales, axe-core audit, reduced-motion respect, localized
  voice-command vocabularies.

## Polish pass — design system, theming & micro-delight ✅

- ✅ Design tokens in `app.css`: signature indigo→violet→rose gradient,
  calm neutral surfaces, dark canvas-surround, radius + elevation scales,
  consistent focus rings; components consume tokens only.
- ✅ Dark theme via `[data-theme='dark']`, toggled in the settings menu,
  persisted in uiPrefs, defaulting to `prefers-color-scheme`.
- ✅ Micro-delight: sliding mode pill, pure-CSS `data-tooltip` tooltips
  (name + shortcut; suppressed in kid mode where spoken names rule),
  dialog/popover fade-scale-in, ambient GPU-cheap drift behind the canvas,
  splash while the last document restores, welcome card with the logo —
  all disabled under `prefers-reduced-motion`.
- ✅ Brand: `DreamMark` (moon + spark) in toolbar/welcome/splash,
  `public/favicon.svg`, proper title/meta/theme-color, and
  `public/manifest.webmanifest` (installable; no service worker yet —
  that's slice 11).
- ✅ Floating zoom pill (−/%/+, tap % to fit-to-window), recent-colors row
  in the options panel, refined selection handles, gradient primary buttons.

## Drawing power tools — symmetry, pressure, wand, lasso, spray ✅

- ✅ Mirror/symmetry mode (options panel: off / vertical / horizontal / quad):
  strokes, shapes and the eraser mirror live across the canvas center axes,
  with a soft dashed accent axis overlay. Mirrored ops are real ops committed
  with the original in ONE undoable command (`engine/symmetry.ts`; document
  model unchanged, session-only toggle, kid rail untouched).
- ✅ Pen pressure: stylus `PointerEvent.pressure` (pen only) modulates
  brush/pencil/eraser width per point (`widths` on the stroke op, renderer
  interpolates). Mouse/touch carry no widths and render exactly as before.
- ✅ Filled shapes: a "Fill shapes" toggle fills rectangles/ellipses with the
  current color (no outline — the simpler, prettier option; outline stays
  the default). Renderer + hit-testing updated.
- ✅ Lasso select (Design mode, `K`): freehand loop; ops whose selection
  bounds CENTER falls inside the polygon are selected (center-based,
  documented in `engine/selection.ts`; point-in-polygon in `geometry.ts`).
- ✅ Magic wand (both modes, `W`): click lifts the contiguous similar-color
  region (tolerance slider) out of the active layer into a floating patch —
  drag to move, Del to delete, "Copy to new layer" to duplicate, Esc to put
  back. Move/delete bake the layer to a raster (the filter model), each as
  one undoable command. Reuses the flood-fill scanline traversal.
- ✅ Spray brush (`S`): airbrush with a density slider; deterministic seeded
  dot scatter — the seed rides on the stroke op so every redraw is identical.
- ✅ Voice commands: "spray", "wand", "lasso", "mirror on"/"mirror off".
- Deviation: symmetry is session-only store state (like zoom), not persisted
  per project; the wand's floating region lives outside the document until
  it is committed, deleted or copied.

## Release harness — e2e, tooling & deployment ✅

- ✅ Playwright e2e (`e2e/`, excluded from Vitest; `testDir` keeps Playwright
  out of `src/`): an 8-test smoke suite — boot/welcome, brush stroke verified
  by real canvas pixels, undo, Design-mode panels, Dream AI generation onto a
  new layer, kid mode round-trip, Arabic RTL, dark theme — plus one committed
  full-page visual baseline of the welcome state (generous thresholds, the
  CSS-regression guard). Runs against `vite preview` of the production build;
  Chromium by default, WebKit/Firefox opt-in via `DREAM_E2E_ALL_BROWSERS=1`.
- ✅ `npm run check` stays fast; `npm run check:full` adds e2e. CI runs e2e as
  its own job (report artifact on failure).
- ✅ Release tooling: version 0.1.0, `CHANGELOG.md` (Keep a Changelog),
  `npm run release -- patch|minor|major` (clean-tree + green-check gate,
  bumps version, seeds the changelog, prints — never runs — the git commands).
- ✅ Deployment: `.github/workflows/deploy.yml` builds with
  `--base=/dream-app/` and publishes `dist/` to GitHub Pages on push to main.
- ✅ PWA icons: `scripts/gen-icons.mjs` rasterizes the SVG mark to 192/512 PNG
  - a maskable tile via chromium (no image dependencies); wired into the
    manifest with relative paths so the project-page base works.

## Slice 13 — App mode: interactive prototypes (v1 ✅)

- ✅ Hotspots: the Link tool (U, Design mode) drags a rectangle on the
  canvas → "when tapped, go to frame…" dialog with an optional transition
  (none / fade / slide). Hotspots are engine data on the frame
  (`frame.hotspots`, additive and backward compatible, IndexedDB-safe) —
  soft accent-tinted dashed rects with a tiny link glyph while the tool is
  active, a Links panel (retarget, re-transition, delete), all undoable
  through the shared History.
- ✅ App preview: Present mode gains a Slideshow / App toggle (plus the
  Links panel's "Preview app" button). In App flavor only hotspots are
  tappable (hover = pointer + subtle highlight), arrows/Space do nothing,
  fade/slide transitions are transform/opacity-only, and Restart/Exit
  affordances stay subtle. Broken hotspots (target frame deleted) are
  flagged in the panel and ignored in preview and export.
- ✅ Standalone HTML export (the showstopper): Export → "Interactive app
  (.html)" produces ONE self-contained file — frames as PNG data-URLs,
  hotspots as transparent buttons, ~50 lines of dependency-free JS for
  tap → transition → screen, responsive fit-to-window scaling, touch and
  keyboard support, a "Made with Dream" corner. Pure generator in
  `engine/appExport.ts`, unit-tested (structure, escaping, percentage
  math, no external URLs).
- ✅ Discovery + voice: a one-line timeline hint ("Link your frames to
  make an app →") when a document has ≥2 frames and no hotspots (skipped
  in kid mode — Play stays the kid path); "preview my app" and "export my
  app" voice commands.
- Future: real component logic (buttons with states, forms, variables),
  multi-page sites (navigation chrome, shared headers), code generation
  (React/HTML scaffold from the prototype model), hotspot targets beyond
  frames (links, overlays/scrolling), prototype sharing via a URL.
- Acceptance met: draw two screens, link a drawn button between them,
  preview the tap, export the HTML — opening the file feels like a magic
  trick: "I drew this, and now it's an app I can send to anyone."

## Slice 14 — The developer surface ✅

Persona: Maria, professional programmer — connect Dream to her toolchain via
MCP in her development flow and APIs in her applications.

- ✅ The `.dream` project file format (v1): UTF-8 JSON envelope
  (`{format: 'dream-project', version: 1, document}`) around a verbatim
  `DreamDocument`, with raster payloads (fill/image patches) serialized as
  base64 PNG data URLs. Pure encode/decode in `src/engine/projectFile.ts`
  with an injectable `RasterCodec` (browser canvas codec in `ui/dreamFile.ts`,
  Node codec in mcp-server). Round-trip fidelity tests: strokes, shapes,
  text, images, frames, hotspots, game setup → file → identical document.
- ✅ App integration: Export → "Dream project (.dream)" downloads the file;
  the Open dialog opens `.dream` files via a picker button or drag-and-drop,
  alongside the IndexedDB library.
- ✅ `mcp-server/` — the **dream-mcp** stdio MCP server, a standalone Node
  package (own package.json/tsconfig; not part of the webapp build, root
  `npm run check` never touches it; `npm run check:mcp` and a separate CI job
  cover it). Tools: `dream.read_project`, `dream.create_project`,
  `dream.list_layers`, `dream.add_text`, `dream.render_png`,
  `dream.export_app`. The server compiles the REAL engine in from
  `src/engine` (no reimplementation); rendering and PNG payloads run on
  `@napi-rs/canvas`. Tool cores are pure functions over the file system
  (`src/tools.ts`, tested in tmp dirs); `src/index.ts` is thin stdio wiring
  (verified over a real MCP initialize + tools/list handshake). Client setup
  snippets in `mcp-server/README.md`.
- ✅ Stable engine API: `src/engine/index.ts` barrel is the semver-intended
  public surface (types, document helpers, history, renderer, filters,
  color, geometry, animation, hotspots, appExport, projectFile) — documented
  in the README; everything else under `src/engine/` is internal.
- Decisions/gaps: the MCP server uses the SDK's low-level `Server` with
  hand-written JSON Schemas (the high-level `McpServer` helper hits a
  TypeScript instantiation-depth error with zod 3.25 — transparent and
  version-proof instead). Canvas codecs premultiply alpha, so
  semi-transparent raster pixels are lossy by a rounding step on PNG
  round-trips (true of browser canvases too); opaque pixels round-trip
  exactly.
- Future: remote MCP (HTTP transport), websocket collaboration on a shared
  document, a plugin API (custom tools/panels), more MCP tools (add shape /
  stroke / image ops, layer management, component library access, AI edits).

## Slice 16 — Research quick wins: stamps, comfort mode, Arabic voice ✅

Three small, high-persona-impact items from the research backlog
(RESEARCH.md §4: #3 stamps & coloring starters, #6 localized voice
vocabularies, #7 senior comfort toggle).

- ✅ Stamps (backlog #3): twelve built-in stamps (star, heart, smiley,
  flower, sun, moon, cloud, tree, fish, butterfly, cat, rocket) — chunky,
  multi-color vector art built from engine ops in `engine/stamps.ts` (no
  assets, deterministic, all ops sharing a groupId so Design mode moves a
  stamp as one object). Click-to-place on the active layer at S/M/L sizes,
  ONE undoable command per stamp. Adult rail gets a stamp tool (N) with a
  picker in the options panel; the kid rail gets a big stamp button opening
  a giant picker grid in the kid panel with spoken names (`ui/StampPicker.tsx`
  shared by both). Voice learned "stamp"/"sticker".
- ✅ Starter scenes (backlog #3): three coloring-book scenes ("Sunny
  garden", "Night sky", "Under the sea") — black outline art sized to the
  document, pure functions in `engine/starterScenes.ts`, inserted as a new
  layer from the picker's "Start with a picture" section (undoable).
- ✅ Senior comfort toggle (backlog #7): "Comfort mode" in the settings
  menu, persisted in uiPrefs. Sets `data-comfort` on the root: bigger body
  text, 44px+ targets, roomier toolbar/rail/panels, and strengthened
  text/border tokens for BOTH light and dark themes. Composes with kid mode
  and RTL (token- and logical-property-based).
- ✅ Arabic voice commands (backlog #6): `ai/voiceCommands.ts` is now a
  dumb matcher over per-locale `VoiceVocabulary` tables — English is the
  base, Arabic merges in (so English keeps working under the Arabic UI).
  Arabic normalization (diacritics/tatweel stripped, alef forms unified)
  before matching; mirror phrases take precedence over the play word they
  contain (شغّل التناظر ≠ play). Recognition language follows the UI locale.
- Acceptance met: a kid stamps a rocket and colors a garden; Victor gets a
  bigger, calmer UI in one tap; Zainab says "تراجع" and Dream undoes.

## Harness engineering — the agentic dev harness ✅

Infrastructure so AI agents (the orchestrator, Claude Code/Codex/Kimi
sessions) can continuously and safely develop Dream. No app-code changes;
every piece points at the existing gates (`check`, `check:full`,
`check:mcp`).

- ✅ `CLAUDE.md` — thin bootstrap for Claude Code: "read AGENTS.md first"
  plus the ten most important facts/commands.
- ✅ `.claude/agents/` — four subagents: `dream-engine` (framework-free
  pure-TS rules), `dream-ui` (string-table/token/RTL/reduced-motion rules),
  `dream-verify` (read-only reviewer: gates + diff review against the
  AGENTS.md rules; the writer never approves its own work) and
  `dream-release` (gate sequence + `scripts/release.mjs`, never mutates git
  without approval).
- ✅ `.agents/skills/` — three project skills: `implement-slice` (the
  proven slice workflow), `verify-release` (full gate sequence incl. the
  macOS-only visual baseline rules — CI skips it via `--grep-invert`) and
  `dogfood-mcp` (build + demo + live tool round-trip against a real
  `.dream` file).
- ✅ `.mcp.json` — repo-root MCP wiring: MCP-capable agents working in this
  repo get dream-mcp automatically once `npm run check:mcp` has built
  `mcp-server/dist/`.
- ✅ `evals/` — a real agent-eval harness: four self-contained cases of
  increasing difficulty (filter preset → voice intent in both locales →
  game setting → MCP tool), each with a deterministic grader
  (`grade(ctx) → {pass, reasons}`: static evidence + targeted vitest +
  behavioral runs, no LLM judging). `node evals/run.mjs --case NN [--agent
"<cmd>"]` grades a tree; `npm run evals` smoke-tests the harness by
  asserting every grader FAILS the untouched tree (ungameable by trivial
  edits).
- ✅ `LOOPS.md` + `loops/` — two bounded loops in the loopy format
  (observe/choose/act/verify/record/stop): `dream-improve` (one backlog
  slice per cycle, push, stop at release time or empty backlog; asks before
  anything public-facing beyond the push) and `dream-release-watch`
  (red CI/deploy → diagnose → minimal fix → verify green; stops green or
  reports credential blockers).
- ✅ `docs/HARNESS.md` — the harness map: how humans and agents use the
  pieces together, the loop diagram, and the dogfooding story (agents build
  Dream with Dream's own MCP server).

- More locales (voice vocabularies are now per-locale tables — adding one is
  data only); axe-core audit.
- Per-OS visual baselines if the generous-threshold single baseline flakes.
- Slice 5/6 remainders: audio track, MP4/WebCodecs export, slide transitions,
  presenter view with notes, per-slide duration.
- Slice 12 remainder: more game templates (platformer, maze, flappy),
  conversational game generation.

## Slice 11 — PWA ✅

- ✅ Basics shipped in the polish pass: web app manifest, SVG icon
  (maskable), theme colors.
- ✅ Offline-first service worker + install/update flow shipped in slice 15
  (below); the document library is offline by construction (IndexedDB).
- Acceptance met: the app installs and boots fully with the network off
  (e2e-verified against a dead server).

## Slice 15 — Offline PWA & performance ✅

- ✅ Hand-rolled service worker (`public/sw.js`, zero build-time deps):
  precaches the app shell under a content-hashed cache name injected by a
  tiny in-house Vite plugin (`dreamServiceWorker` in `vite.config.ts`);
  navigations network-first with cached-`index.html` fallback, same-origin
  GET assets cache-first, non-GET and cross-origin requests (AI provider
  calls) bypass the cache entirely; old caches purged on activate.
- ✅ Versioned updates: a quiet "A new Dream is ready — Refresh" toast
  (i18n, both locales); the worker activates only on user action
  (`DREAM_SKIP_WAITING`), reload follows `controllerchange`.
- ✅ Install prompt: `beforeinstallprompt` captured into a dismissible
  "Install Dream" row in the settings menu (dismissal persisted).
- ✅ Registration is production-only (`import.meta.env.PROD`) and
  feature-detected; unit-tested with fake containers (gating, first
  install vs. update, skipWaiting payload, failure swallow).
- ✅ Offline e2e: boots, then kills a throwaway static server serving
  `dist/` and asserts the app still boots from the precache. (Real dead
  server: Chromium fails SW-intercepted subresources under
  `setOffline`/`route.abort` emulation — documented in the spec.)
- ✅ Incremental rendering (`engine/layerCache.ts`, DOM-free): per-layer
  bitmap cache with reference-equality invalidation; unchanged documents
  composite at ≤ layers+1 draw calls (asserted on a 500-op benchmark doc
  vs. ≥5 calls/op uncached). Eraser docs fall back to a whole-document
  snapshot (destination-out punches through layers); >2048² px docs skip
  caching; LRU cap 16; bitmaps released on delete/document close. Timeline
  thumbnails memoized per frame.
- Future: runtime caching of exported media, background sync of autosaves
  (both unnecessary today — everything is already local), per-OS visual
  baselines if the single baseline flakes.

## Slice 12 — Games & app generation (v1: Catch! ✅)

- ✅ Play mode: a fourth workspace mode (Draw / Design / Play / Present) that
  turns the drawing into a playable mini-game right on the canvas. First
  template, **Catch!**: catch the good things, dodge the bad ones — score,
  lives, "3… 2… 1…" countdown, score pops, bad-catch shake, game-over card
  with best score (persisted per project in localStorage).
- ✅ Casting: any layer can be cast as the Hero / Good Thing / Bad Thing /
  Background from the cast panel, or "Draw it now" creates and casts a named
  layer in one tap; uncast roles get procedural stand-ins (smiley, star,
  spiky rock — `game/defaults.ts`, no AI). Cast + settings live on the
  document (`doc.game`, additive, IndexedDB-safe), outside undo like `mode`.
- ✅ Pure game core in `src/game` (framework-free like the engine):
  `tick(state, input, dtMs, rng)` with seeded RNG, spawn/collision/score,
  difficulty ramp — fully unit-tested. Settings (fall speed, spawn rate,
  lives) with gentler kid defaults; procedural WebAudio bleeps
  (`game/sounds.ts`, feature-detected; on in kid mode, off for adults).
- ✅ Kid mode + voice: gamepad button in the kid toolbar, giant play button
  and big on-screen arrows; "play my game" starts a run, "stop" ends it.
- ✅ Template system + two more templates (slice 17): a shared template
  interface (`game/template.ts`) with Catch! refactored onto it, plus **Flappy
  Dream** (flap through scrolling gates; kid mode gets 3 shields) and **Maze
  Runner** (seeded, always-solvable generated mazes; level-up grows the maze).
  Template picker cards in the cast panel; casting adapts to each template's
  roles; the choice persists on the document. Voice: "play flappy" / "play
  maze" / "play catch" (EN + AR).
- Remaining: platformer template, conversational game
  generation from a sentence. (The MCP/API hooks for developer workflows —
  persona: Maria — shipped as slice 14, the developer surface.)
- Acceptance met: a child draws a blob, casts it as the hero, presses play —
  and their own drawing catches stars.
