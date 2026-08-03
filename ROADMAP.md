# Roadmap

Dream ships in slices. Slice 1 (core drawing app + harness), slice 2 (image
editing), slice 3 (design mode), slice 4 (animation + video export +
presentation mode), slice 7 (AI panel), the accessibility trio — slices 8
(voice commands), 9 (kid mode) and 10 (i18n) — the release harness, the
drawing power tools (symmetry, pressure, filled shapes, lasso, magic wand,
spray), game mode v1 (Catch!, the first slice-12 template), app mode v1
(interactive prototypes: hotspots, app preview, standalone HTML export),
the developer surface (.dream project files, the dream-mcp server, the stable
engine API) and the AI make-real code export (a readable single-file app
generated from the hotspot graph, BYOK or the free local template) are done. Each slice below lists brief acceptance criteria; slices
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
  apply to EVERY frame. The optional audio track followed in slice 19 and
  presentation depth in slice 24; only the MP4/WebCodecs path remains below.

## Slice 5 — Video export ✅

- ✅ WebM export shipped in slice 4 (MediaRecorder, VP9/VP8 fallback).
- ✅ Optional audio track shipped in slice 19 (voice narration baked into the
  WebM via a WebAudio mix).
- ✅ Native MP4 path shipped in slice 25: browsers that report MP4 support
  record the same canvas/narration stream into a real `.mp4`; unsupported
  browsers do not see the option. WebCodecs alone produces uncontainerized
  chunks and would require a muxer dependency, so feature-detected
  MediaRecorder is the smaller truthful path.

## Slice 6 — Presentation mode ✅

- ✅ Basic deck shipped in slice 4 (frames as slides, keyboard/click
  navigation, fullscreen, slide counter).
- ✅ Completed in slice 24: optional per-slide enter transitions, 1–60 second
  auto-advance timing, private speaker notes and an in-session Presenter view.
  Settings save together as one undoable frame edit; old decks remain instant
  and manual. Auto pauses on untimed slides and at the end.

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
  images; edit capability was initially false and becomes explicit
  `/images/edits` opt-in with slice 20).
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
- ✅ Automated serious/critical accessibility audit shipped in slice 26 across
  Draw, Design, Play, slide settings and Presenter; it caught and corrected
  light-theme secondary/accent contrast before becoming a browser gate.
- Remaining: more locales. Reduced-motion and localized English/Arabic voice
  vocabularies shipped in later polish slices.

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

## Slice 18 — AI "make real" code export ✅

Research backlog #1 (RESEARCH.md §4): close the tldraw make-real gap on
Dream's own terms — the hotspot graph is a better input than pixels, and
BYOK means no platform lock-in. From an animated document, generate a REAL,
human-readable single-file web app — semantic HTML a developer (persona:
Maria) or a kid's parent can open, read and extend.

- ✅ Structured app description (`src/ai/makeReal.ts`, pure): document →
  compact payload — app name, per-screen background + dominant colors
  (reusing the feedback palette work), text elements (content, position,
  size, color), shapes/images summarized as kind + box + color (never
  pixels) and the navigation graph (screen N --hotspot rect--> screen M,
  transition), capped small enough for cheap models.
- ✅ Prompt + parsing: a system+user prompt pair asks for ONE self-contained
  semantic, accessible, responsive, commented HTML file with hash-router
  navigation; `extractHtmlFromReply` pulls the HTML out of messy replies
  (preamble, multiple fences, truncated) and `validateGeneratedHtml`
  rejects anything that isn't a self-contained document (no external http
  refs) with a friendly error.
- ✅ Two generation paths: a chat-capable BYOK provider writes the code
  (works with OpenRouter/Ollama/LM Studio — `chat` messages now accept a
  `system` role); the built-in Dream AI runs a deterministic TEMPLATE
  generator instead of refusing — screens as `<section>`s, text as real
  text, shapes as styled divs, hotspot nav wired to a tiny hash router —
  honestly labeled "generated locally by Dream AI", free and offline, and
  counted against the 20/day free tier like other Dream AI actions.
- ✅ UI: Export → "Real code (AI) (.html)" next to "Interactive app":
  progress ("Dreaming in code…"), success downloads `{name}-code.html` and
  shows a small note, errors are friendly (unparseable/unsafe model output
  suggests retry or the deterministic export). Every generated file opens
  with "Made with Dream — where drawings come alive."
- ✅ Voice: "export real code" / "make it real" (EN) and «صدّر كود حقيقي»
  (AR) run the same flow, announcing when the download lands.
- Fidelity correction: the Dream AI path still turns freehand drawings into
  honest soft approximation panels, but imported and AI-made raster pictures
  now remain their real inline PNG pixels instead of placeholder boxes. BYOK
  receives the same self-contained assets. The deterministic pixel-faithful
  "Interactive app" export stays untouched as the no-AI default.
- Acceptance met: draw two linked screens → Export → Real code (AI) → the
  downloaded file opens as a working app whose source reads like a gift:
  commented, semantic, your colors and words intact.

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
  `dream.list_layers`, `dream.add_layer`, `dream.add_text`,
  `dream.add_shape`, `dream.render_png`, `dream.export_app`. The server
  compiles the REAL engine in from
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
  document, a plugin API (custom tools/panels), more MCP tools (freehand
  strokes, raster import, full layer management, component library access,
  AI edits).

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
- Video and presentation remainders are complete (slices 24–25).
- Slice 12 is complete: Catch!, Flappy Dream, Maze Runner, Dream Jumper and
  conversational game creation are shipped.

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

## Slice 12 — Games and conversational creation ✅

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
- ✅ Conversational creation shipped in slice 22 and the fourth **Dream
  Jumper** platformer shipped in slice 23. (The MCP/API hooks for developer
  workflows — persona: Maria — shipped as slice 14, the developer surface.)
- Acceptance met: a child draws a blob, casts it as the hero, presses play —
  and their own drawing catches stars.

## Slice 19 — Voice narration ✅

Research backlog #4 (RESEARCH.md §4): record your voice over animations and
presentations, and bake it into exported videos. Personas: Zainab (5,
narrating her flipbook), Ahmed (voice-over shorts), Victor (stories over
slides). One narration track per document, starting at time 0 — per-frame
tracks deliberately out of scope (one "tell the whole story" take is how
people actually narrate, and it keeps recording a one-tap gesture).

- ✅ Recording (`src/ui/narration.ts`, browser layer behind injectable deps):
  getUserMedia + MediaRecorder with a friendly mime fallback
  (opus/WebM → WebM → MP4 → Ogg), an idle/recording/error state machine, mic
  level via AnalyserNode for the recording indicator, and jargon-free
  permission errors in EN+AR (denied / no mic / busy / unsupported). The mic
  is asked for on the first record only; the button hides where recording is
  unsupported. The take is stored on the document as a data URL
  (`doc.narration`, additive, outside undo like `mode`/`animation`), persists
  through IndexedDB and `.dream` files, and warns over ~10 MB.
- ✅ Timeline UI (`src/ui/NarrationControls.tsx`): one tap starts recording
  AND playback (natural timing), one tap stops and saves; a pulsing red dot,
  elapsed time and live level while recording; re-record replaces after a
  gentle inline confirm (kid mode never asks); delete and a session mute
  toggle. Kid mode gets the big friendly "Tell the story!" mic.
- ✅ Playback: the take plays from the start during editor playback and when
  a Present session opens (small indicator + mute button there too);
  autoplay refusals are swallowed, muting/restarting is instant.
- ✅ Export: WebM gains the narration as its audio track — the take is
  decoded and mixed via AudioContext → MediaStreamDestination and combined
  with the canvas captureStream tracks into one MediaStream for
  MediaRecorder (composition unit-tested with fakes). No take → byte-for-byte
  the old behavior.
- ✅ Voice commands: "record narration" / "stop recording" /
  "delete narration" (EN) and «سجّل صوتي» / «أوقف التسجيل» / «امسح الصوت»
  (AR) — phrases take precedence over the stop/clear words they contain.
- Acceptance met: a kid records "once upon a time…" over her three-frame
  animation, plays it back with her voice, and exports a WebM that talks —
  one tap deep throughout, and nothing ever leaves the device.

## Slice 20 — BYOK generative fill and erase ✅

Research backlog #5 (RESEARCH.md §4): make selective AI editing as immediate
as Paint's Generative Erase and Firefly's Generative Fill without pretending
the offline provider is generative. Personas: Ali and Fatima editing artwork;
Sara removing distractions or adding a missing detail.

- ✅ Honest capability configuration: OpenAI-compatible settings gain an
  optional edits model (suggested current OpenAI value: `gpt-image-2`). A
  non-empty value alone enables BYOK editing; blank keeps the capability off
  for chat-only and generation-only endpoints.
- ✅ Real `/images/edits`: same-size PNG image + alpha mask + prompt are sent
  as multipart form data. Transparent mask pixels mark the requested edit;
  current GPT Image models and compatible endpoints using the legacy singular
  image field are both handled. Returned base64 PNGs are decoded and normalized
  back to the layer size.
- ✅ Generative-fill UX: the selected Design-mode bounding box becomes the
  mask; without a selection the whole active layer is edited. The source
  pixels outside a selection are restored even if the model strays beyond the
  mask, and the final bake is one undoable history command.
- ✅ One-tap **Erase this** uses the neutral remove-and-fill-background prompt
  for edits-capable BYOK providers. Dream AI remains honestly filter-based and
  never shows the generative erase action.
- ✅ Browser PNG encoding and network/image decoding stay injected; mask,
  multipart request, capability/persistence, result merge, friendly failures
  and undoable raster bake are unit-tested. EN+AR strings remain in parity.
- Acceptance met: select a photobomber, press **Erase this**, and only that
  area is naturally replaced; undo restores every original pixel.

## Slice 21 — MCP authoring and registry readiness ✅

Research backlog #8 (RESEARCH.md §4): let Maria do useful visual authoring
through an agent, and make the companion server ready for the official MCP
registry without performing a public release automatically.

- ✅ Two authoring tools: `dream.add_layer` adds a top layer to the active
  frame, and `dream.add_shape` appends a line, rectangle or ellipse with
  validated geometry, color, opacity and fill. Both preserve the active-frame
  mirror contract in animated documents and return stable ids for follow-up
  calls.
- ✅ The example round-trip now creates a project, adds a layer, draws a shape,
  adds text, reads the summary and renders the real PNG. Unit tests cover
  normalization, invalid input, layer targeting and animated write-through;
  the live MCP handshake exposes all eight tools.
- ✅ Registry-ready package identity and metadata: the publishable npm package
  is `@ammar-hasan/dream-mcp`, with the matching registry identity
  `io.github.ammar-hasan/dream-mcp`, MIT license, scoped public publish config,
  curated tarball and a schema-valid `server.json`.
- Public npm and registry publication remains pending explicit approval; the
  package and registry records are external, irreversible user-facing actions.
- Acceptance met locally: an MCP client creates a `.dream`, adds a named layer
  with a filled rectangle and text, reads both operations in the summary and
  renders them into a PNG that opens with the same content in Dream.

## Slice 22 — Make a game from words ✅

Research backlog #2 (RESEARCH.md §4): give Zainab and George the shortest path
from an idea to a playable result while keeping Dream local-first and honest
about the mechanics it supports.

- ✅ A compact **Describe your game** maker in the Play cast panel accepts an
  English or Arabic request, selects Catch!, Flappy Dream, Maze Runner or
  Dream Jumper and
  applies difficulty language (easy/hard, fast/slow, many/few, explicit
  lives/shields) to the existing visible settings. The shared feature-detected
  prompt mic enables voice creation and follows the active locale.
- ✅ Mentioned layer names become the cast. Familiar semantic names choose the
  natural role (`Rocket` → hero, `Clouds` → obstacle, `Stars` → good,
  `Rocks` → bad); other named layers fill supported roles in mention order.
- ✅ Planning is deterministic, offline and free: no provider request, no
  invented physics and no automatic run. The picker, cast rows and settings
  show exactly what Dream understood, followed by a ready message and the
  normal Play button.
- ✅ Pure bilingual planner tests cover template choice, semantic casting,
  fallback, difficulty composition and blank input; a component test proves
  the request updates the persisted game setup. EN+AR strings remain in parity.
- Conversational creation spans every game Dream currently promises; the
  final platformer followed in slice 23.
- Acceptance met: with Rocket and Clouds layers, “My Rocket flies through
  Clouds, nice and slow” prepares a gentle Flappy game with both drawings cast,
  entirely offline.

## Slice 23 — Dream Jumper platformer ✅

Research backlog #2 (RESEARCH.md §4): complete the approachable game set with
the classic run-and-jump shape Zainab expects, without adding a physics or
scene-graph dependency.

- ✅ Fourth template **Dream Jumper**: run left/right, jump across a short
  side-scrolling course, collect stars and reach the flag. Falling spends a
  life and respawns; zero lives ends the run; reaching the flag wins with the
  collected score.
- ✅ Pure seeded level generator with broad start/finish platforms, bounded
  gaps and bounded neighboring height changes. The pure core covers movement,
  edge-triggered jumps, forgiving one-way landing, one-time collectibles,
  respawn/game-over and win.
- ✅ Casting extends naturally: Hero, Collectible, Platforms and Background,
  with smiley/star/grass-earth stand-ins. Run speed and lives reuse the shared
  persisted settings; kid mode gets slower movement, five lives and large
  left/jump/right controls.
- ✅ Canvas view adds a following camera, score/lives HUD, finish flag, pops,
  shake and existing procedural sounds. Picker becomes a legible 2×2 grid;
  EN+AR labels and "play platformer" / «العب المنصات» voice selection ship in
  parity. The words-to-game planner recognizes run/jump/platform/flag requests.
- Acceptance met: select Dream Jumper, press Play, run and jump across the
  generated platforms, collect a star and reach the flag; a fresh run produces
  a different but still approachable course.

## Slice 24 — Presentation depth ✅

Research backlog #9: make the shared frame model credible for real talks while
keeping old decks manual and unchanged.

- ✅ Each slide owns its enter transition, optional 1–60 second duration and
  presenter-only notes; one Save and one Undo cover the complete edit.
- ✅ Auto follows timed slides and pauses at manual or final slides. Presenter
  view shows notes, timing and what comes next without painting them onto the
  audience artwork.
- ✅ Reduced motion makes transitions instant, duplicated frames copy their
  settings, and the complete contract persists in `.dream` projects.

## Slice 25 — Native MP4 animation export ✅

- ✅ Browsers that advertise an MP4 recording codec expose a true MP4 option;
  other browsers never see a dead control or a renamed WebM file.
- ✅ MP4 shares the proven flipbook timing, progress and optional narration
  mix with WebM. The produced container and filename match the selected format.

## Slice 26 — Automated accessibility floor ✅

- ✅ Serious and critical browser accessibility scans cover Draw, Design,
  Play, slide settings and Presenter in both themes.
- ✅ The first strict pass corrected six contrast failures through shared
  visual tokens; normal, secondary and accent text now meet WCAG AA.
- Manual assistive-technology and complete focus-order testing remain human
  validation work, not something an automated scan can certify.

## Slice 27 — Social-ready stories and real image fidelity ✅

Persona: Ahmed, social-media storyteller — send a narrated drawing in the
shape people actually watch, without losing any artwork.

- ✅ WebM and supported MP4 export Original, Vertical 9:16, Square 1:1 or
  Landscape 16:9 at 720p. The canvas is contained and centered without crop or
  stretch; shaped filenames name the selected output.
- ✅ The recording stream requests 30 fps for platform compatibility while
  each drawing still holds for its authored 1–24 fps flipbook duration.
- ✅ Each frame owns a short caption. Export offers previous/next and
  copy-to-all editing, burns captions into a readable lower safe area, and
  saves the whole batch as one undoable change. Slide settings and timeline
  thumbnails expose the same content.
- ✅ Real Code output embeds the actual inline PNG pixels of imported and
  AI-made images instead of placeholder boxes. Connected OpenAI image creation
  exposes its own model and uses the current GPT Image request contract before
  normalizing the result to the exact Dream canvas.
- Acceptance met: draw and narrate a multi-frame story, add captions, export a
  vertical video, and play a complete uncropped, captioned result on a phone;
  generate a connected-AI image and see real pixels on both the canvas and in
  the self-contained Real Code app.

## Slice 28 — Voice-to-storyboard animation ✅

Personas: Zainab and George — turn one spoken idea into a complete, visible and
recoverable animation without assembling frames by hand.

- ✅ A deterministic English/Arabic planner turns one story into two to six
  moments without contacting a provider or mutating the document. Every moment
  is editable, removable, addable, replannable and individually readable aloud.
- ✅ Adult Story and Little Dreamer Tell a story entry points share one
  confirmable flow. Kid dictation plans immediately, kid action names speak on
  hover/focus/touch, and global “make a story about…” / «اصنع لي قصة عن…»
  commands open a prefilled plan without colliding with narration commands.
- ✅ The active image-capable provider paints frames sequentially with the full
  story in each continuity prompt; an image-less setup visibly falls back to
  Dream AI. Results are held until all requests succeed, then captions and real
  raster frames commit as one History command.
- ✅ Blank canvases become only the story; static art is preserved as frame 1;
  existing animations are appended. New storyboards loop and play at 1 fps,
  and one Undo/Redo removes/restores the complete batch.
- ✅ One whole Dream AI storyboard consumes one daily try, while image-capable
  BYOK providers remain unlimited. Unit, component, browser and accessibility
  coverage prove planning, provider failure, preserved art and one-step undo.

## Slice 29 — Private synchronized Presenter window ✅

Persona need: keep speaker notes and controls genuinely private when the
audience is watching a projected or shared window.

- ✅ Presenter opens a same-session second window. The audience stage contains
  no notes; closing the console leaves the slideshow running, while leaving
  Present or switching to App closes it.
- ✅ The console renders current and next slide previews, private notes,
  elapsed session time, authored timing and a live remaining-time countdown.
- ✅ Previous, Next, Auto, keyboard navigation and audience-side navigation
  stay synchronized. The presenter can focus the audience window, close only
  the console or exit the complete session.
- ✅ A blocked popup produces a friendly audience-safe message rather than an
  in-window notes fallback. Theme, RTL, responsive layout and serious/critical
  browser accessibility checks apply in the second window too.
- Acceptance met: present a two-slide deck, open Presenter, control the audience
  from the private console, and verify notes never enter the audience DOM.

## Slice 30 — Phone timeline task focus ✅

Persona need: let a phone user work with one interpretation of shared frames at
a time without losing the frame strip or basic frame editing.

- ✅ The adult phone timeline presents Animate, Slides and App as explicit
  task choices while keeping live frames and add/duplicate/reorder/delete in
  view for every task.
- ✅ Animate contains playback, narration, fps, Loop and Onion; Slides contains
  the current frame's Slide settings; App presents one large Link action until
  links exist, then Preview app.
- ✅ Wider layouts retain the complete timeline and Little Dreamer retains its
  simpler animation-only controls with no extra reading-dependent choice.
- ✅ A real 390 × 844 production-build interaction test proves every task,
  prevents the chooser from overflowing, and scans all three states for
  serious or critical accessibility violations. All three rendered states
  received a principal-design visual review.
- Acceptance met: switch among all three phone tasks, keep the same two frames
  editable throughout, and enter Design's Link tool directly from App.

## Slice 31 — Private no-backend prototype links ✅

Persona need: let a creator send a clickable prototype as a URL while
preserving Dream's local-first trust and presenter privacy.

- ✅ Share app link flattens every screen and includes only viewer geometry,
  transitions, title, dimensions and start screen. Layers, hidden content,
  notes, captions, narration, game state and AI settings never enter the link.
- ✅ The compressed fragment opens directly in the standalone responsive app,
  with the same real hotspot buttons, transitions, restart and reduced-motion
  behavior and no upload or account.
- ✅ Copy link works as the universal path and leaves a selectable field when
  clipboard access fails. Large visual prototypes are directed to the existing
  Interactive app file instead of creating unreliable URLs.
- ✅ Incoming data has strict size, image, dimension, target, geometry and
  transition validation; supplied markup is never executed. A bad link falls
  back to the editor with a friendly warning.
- ✅ Share loading and creation are on demand, keeping the main production
  bundle below its 500 kB budget. Unit and production-browser tests prove the
  safe round-trip and private-note exclusion.
- Acceptance met: add private notes to a two-screen prototype, copy its link,
  open a fresh tab directly into the app, and confirm the notes and editor are
  absent.

## Slice 32 — Synchronized video trimming ✅

Persona need: cut a social-video delivery without destructively deleting the
creator's animation or desynchronizing its recorded story.

- ✅ WebM and MP4 preparation expose inclusive Start frame and End frame
  choices, with duration and recording progress recalculated for the range.
- ✅ The range is export-session state only. Frames, order and captions remain
  intact, no trim history entry is created, and a reopened dialog selects the
  complete animation.
- ✅ Narration starts at the selected frame's exact time offset and the recorder
  ends with the trimmed video, preserving picture/voice alignment.
- ✅ Caption edits retain their existing one-command undo behavior even when the
  delivery is trimmed.
- ✅ Unit tests prove range clamping, duration, rendering count, immutability and
  audio offset; production-browser and accessibility tests cover the controls
  and a real one-frame WebM delivery.
- ✅ Export loads only when requested, restoring the production entry bundle to
  493.45 kB after the new controls.
- Acceptance met: trim a two-frame captioned video to frame 2, export it, keep
  both source frames, and undo the caption batch without a trim edit.

## Slice 33 — Persian calligraphy path ✅

Persona: Fatima, Iranian calligraphy explorer — create in her own language
with a mark that behaves like a broad nib rather than a renamed round brush.

- ✅ فارسی is a complete, parity-checked RTL interface with warm Iranian
  Persian copy, persistent instant switching and an in-viewport Settings path.
- ✅ Dictation requests Iranian Persian; the global microphone covers the same
  tool, color, recovery, animation, app, code, game and narration intents as
  the earlier languages while English remains available. Persian sequence
  words plan local story moments before any provider is called.
- ✅ The Brush offers Round or a fixed 45° Calligraphy nib. Direction creates
  thin and broad strokes for mouse and touch; pen pressure multiplies that
  shape, and the baked widths stay deterministic and undo as one gesture.
- ✅ Text adds a Persian-script choice that prefers installed Nastaliq/Naskh
  faces and keeps an offline-capable fallback.
- ✅ A production rendered review corrected clipped RTL Settings placement and
  invalid menu semantics. Browser interaction and serious/critical
  accessibility checks cover the Persian Settings-to-calligraphy journey.
- ✅ Large conditional surfaces load only when entered, leaving the production
  entry bundle at 472.84 kB despite the third complete language table.
- Acceptance met: switch to فارسی, keep Settings visible, choose the
  Calligraphy nib, paint a real directional mark, use Persian script text and
  issue Persian voice/story commands without losing English recovery commands.

## Slice 34 — Scientific connectors and scalable delivery ✅

Persona need: let Zǐxuān communicate a scientific idea and let Sara deliver a
logo without flattening genuinely scalable work into pixels.

- ✅ Lines can be plain, arrow-ended or arrowed both ways. End style is baked
  into each undoable connector and renders consistently in the canvas and SVG.
- ✅ Text entry has a compact caret-aware strip for subscripts, superscripts,
  reaction arrows and common scientific symbols. The placement click no longer
  closes its own input or leaves first-run guidance over the writing surface.
- ✅ SVG export preserves the active canvas/frame's visible background, layer
  and mark opacity, shapes, connectors, text, spray and uniform or
  pressure-width strokes under a stable document-derived filename.
- ✅ SVG remains truthful: visible pixels, baked fills/adjustments and eraser
  marks disable that one action with a plain PNG fallback; hidden unsupported
  layers do not block the visible vector result.
- ✅ Pure geometry/export tests, a real downloaded-file browser proof, a
  serious/critical accessibility scan and two rendered principal-UX states
  cover the path.
- Acceptance met: author a reversible-reaction connector, replace `2` with `₂`
  at the text caret, download a real scalable SVG containing both, and receive
  an honest fallback if the visible work cannot remain vector.

## Slice 35 — Native scientific data plots ✅

Persona need: let Zǐxuān turn a small experiment table into a figure inside the
same canvas where he diagrams, annotates, animates and explains the science.

- ✅ Plot data accepts a labeled CSV or TSV table with 2–200 numeric rows, one
  horizontal variable and up to four measured series. Quoted labels work;
  blank, uneven, non-numeric and oversized input is explained without mutation.
- ✅ Line, scatter and grouped-bar choices share automatically rounded axes,
  readable ticks, a quiet grid, title, horizontal label and a genuinely
  color-keyed legend. Bars include zero; line/scatter preserve numeric spacing.
- ✅ The dialog begins with a valid example and reports parsed rows/series
  before Insert, keeping the path learnable without a spreadsheet or manual.
- ✅ A plot is one new layer made entirely of grouped native marks. It selects
  and transforms as one figure, remains editable through Dream's existing
  operations, saves unchanged, animates, exports as real SVG and undoes once.
- ✅ The parser/geometry remain framework-free and dependency-free; focused
  unit, store, browser, downloaded-SVG, accessibility and rendered UX checks
  cover both the input and the publication-shaped result.
- Acceptance met: paste a two-series reaction dataset, insert a clean line
  figure, move it as one group, export it as SVG and remove it with one Undo.

## Slice 36 — Complete Simplified Chinese journey ✅

Persona: Zǐxuān, Chinese chemistry researcher — create, explain and deliver in
his own language instead of navigating an English product around a science
feature.

- ✅ 简体中文 covers every product string with exact key and interpolation
  parity, switches instantly and persistently, remains left-to-right and
  requests Mainland Mandarin for recognition and speech.
- ✅ Natural unspaced Chinese commands cover the complete tool, color,
  recovery, animation, game, app, code-export and narration surface. Polite
  phrases work, adjacent intents retain their precedence, and English remains
  available under the Chinese UI.
- ✅ Chinese punctuation plus 然后/接着/随后/之后/最后 split local story plans;
  a single idea gets natural 开头/接下来 moments before any provider call.
- ✅ Chinese game descriptions choose all four templates, difficulty, speed,
  quantity, one-to-five lives and Chinese-named layer roles with the same
  deterministic offline planner.
- ✅ The full table was generated through the user-authorized OpenAI platform
  key in memory, then structurally validated and read end to end; critical
  command, science, recovery and delivery language received manual review.
  Focused unit tests and a production-browser journey prove the registered
  language reaches Plot data rather than merely appearing in Settings.
- Acceptance met: switch to 简体中文, paste experiment data into a recognized
  plot, use an unspaced Chinese command/story/game request and keep the same
  offline, recoverable outcomes and English fallback commands.

## Slice 37 — Complete Brazilian Portuguese journey ✅

Persona: Maria, Brazilian agentic programmer — move between visual creation,
portable project files and code delivery in her own language.

- ✅ Português (Brasil) covers every product string with exact key and
  interpolation parity, persistent LTR switching and Brazilian Portuguese
  recognition/speech.
- ✅ Brazilian commands cover the complete tool, color, recovery, animation,
  game, app, code-export and narration surface while English remains available.
- ✅ Portuguese sequence words plan local story moments; Portuguese game
  descriptions choose templates, settings, one-to-five lives and named-layer
  roles offline.
- ✅ End-to-end manual review corrected literal art language, Portuguese sample
  data and the unsafe “cast layers” → “scale layers” draft before registration.
  Non-default locales remain isolated from the production entry chunk.
- ✅ Focused unit tests and a production browser journey reach portable-project
  and real-code export actions in Portuguese rather than stopping at Settings.
- Acceptance met: switch to Português (Brasil), reach both `.dream` and real
  code delivery, use Portuguese command/story/game language and retain the same
  private, offline and English-fallback behavior.
