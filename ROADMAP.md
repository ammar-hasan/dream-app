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
- ✅ Live preview; Apply saves one undoable editable layer effect without
  replacing original marks, Cancel restores saved settings. Presets: B&W,
  Vintage, Cool, Warm. (Upgraded from the original baked model in slice 72.)
- ✅ Move tool for layer content; per-layer flip H/V and rotate 90° CW/CCW;
  crop tool (whole document) and resize dialog (scale-to-fit, nearest sampling).
- ✅ Export flattened PNG or JPEG (quality setting), including imported images
  and filter results.
- Current scope is one complete revisitable settings object per layer rather
  than a reorderable stack; masks and stacked effects remain future depth.

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
- ✅ Graceful degradation: the global mic stays discoverable where
  SpeechRecognition is unsupported and explains the touch/mouse/keyboard
  fallback; mic-permission denial gets a friendly message.
- ✅ Localized command vocabularies now cover English, Arabic, Persian,
  Simplified Chinese, Brazilian Portuguese and Russian. The forgiving parser
  remains deliberately bounded and locale-aware; conversational clarification
  and reference resolution are still future depth.

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
  `dream.list_layers`, `dream.add_layer`, `dream.update_layer`,
  `dream.remove_layer`, `dream.add_stroke`, `dream.add_text`, `dream.add_shape`,
  `dream.render_png`, `dream.export_app`. The server
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
  document, a plugin API (custom tools/panels), more MCP tools (raster import,
  component library access, AI edits).

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
  the live MCP handshake exposes all eight tools shipped in that slice.
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

## Slice 38 — Complete Russian journey ✅

Persona: Aleksandr, Russian graphics and product designer — use Dream's
productivity surface in his own language without losing keyboard speed.

- ✅ Русский covers every product string with exact key and interpolation
  parity, persistent LTR switching and Russian recognition/speech.
- ✅ Russian commands cover the complete tool, color, recovery, animation,
  game, app, code-export and narration surface while English remains available.
  Common instrumental color forms work in natural fill commands.
- ✅ Russian sequence words plan local story moments; Russian game descriptions
  choose templates, settings, one-to-five lives and named-layer roles offline.
- ✅ End-to-end manual review replaced literal or awkward art/product wording,
  corrected plot grammar and preserved game casting as role assignment.
  Non-default locales remain isolated from the production entry chunk.
- ✅ Focused unit tests and a production browser journey reach Design and prove
  mode-aware keyboard tool switching in Russian rather than stopping at Settings.
  Long translated labels can scroll without hiding Story, recovery or Settings.
- Acceptance met: switch to Русский, enter Design, use keyboard-first tools,
  issue Russian command/story/game language and retain the same offline,
  recoverable outcomes and English fallback.

## Slice 39 — Focused professional brush presets ✅

Persona need: give Ali and Aleksandr fast, repeatable mark-making without
turning Draw into a brush-engine cockpit.

- ✅ Fine ink, Soft marker, Bold paint and Calligraphy each set size, opacity
  and tip together from one compact, localized control.
- ✅ The underlying controls remain visible and editable; a manual change
  clears the active preset instead of creating hidden state.
- ✅ Presets are session-only and affect future marks only. Existing art and
  the document history remain untouched.
- Acceptance met: choose any preset, see its exact settings, adjust it freely
  and draw with the resulting ordinary, portable stroke.

## Slice 40 — One-click brand delivery ✅

Persona need: let Sara hand a logo to a client, and Aleksandr repeat a common
multi-size delivery, without exporting and renaming every file separately.

- ✅ Brand pack downloads one safely named ZIP with the active canvas at its
  source size and at exact 1024 px and 512 px long edges, preserving aspect.
- ✅ A real scalable SVG joins only when every visible mark remains vector-safe;
  raster or eraser content omits SVG while all three PNG deliveries still work.
- ✅ Output generation changes no source pixels, dimensions, layers or history.
  The focused choice and its truthful fallback are localized in all six
  languages.
- ✅ Deterministic ZIP/CRC, sizing and filename tests plus a production-browser
  download proof inspect the archive, PNG dimensions and SVG payload.
- Acceptance met: create a logo, choose Brand pack once, receive the complete
  portable delivery and keep editing the unchanged source document.

## Slice 41 — Agent-safe layer management ✅

Persona need: let Maria's agent correct and organize a `.dream` layer stack,
not merely append more content whenever a draft changes.

- ✅ `dream.update_layer` targets a layer by id or name and can rename,
  show/hide, set opacity, lock/unlock and move it to an exact zero-based stack
  index in the active frame.
- ✅ `dream.remove_layer` removes by id or name but refuses the final layer, so
  every frame remains structurally valid. Unknown targets and invalid values
  fail without writing a partial result.
- ✅ Both operations preserve the active-frame mirror in animated documents and
  return stable layer/index/frame facts for the agent's next decision.
- ✅ The standalone package tests real `.dream` files for both addressing modes,
  validation, ordering, deletion and animated write-through; its demo and live
  MCP surface exercise the shipped tools.
- ✅ The completed remove-layer agent eval advanced to the next missing
  freehand-stroke authoring task before this slice began.
- Acceptance met locally: create a project, add a draft and scratch layer,
  configure/reorder the draft, remove the scratch layer, reopen/render the same
  project and retain one protected base layer.

## Slice 42 — Truthful AI provider state ✅

Persona need: let any creator know which image maker will receive the next
prompt before spending time, a free try or API credit.

- ✅ A first-time own-AI choice stays selected while its form is being filled;
  Create is disabled with a direct Save instruction until setup is committed.
- ✅ A saved provider can be switched away from and back to immediately without
  re-saving its settings or leaving stale provider state in the panel.
- ✅ The free provider is visibly described as a bounded offline scene maker,
  with its supported themes named beside the prompt. Connected AI gets separate
  open-ended guidance.
- ✅ Browser coverage proves pending setup, reactivation and returned image
  pixels; a real `gpt-image-2` request rendered a dinosaur on a new layer
  without persisting the test key in the repository.
- Acceptance met: the visible provider and guidance match the next Create
  action, and an unfinished connection can never fall through to offline art.

## Slice 43 — Agent freehand authoring ✅

Persona need: let Maria's agent sketch and revise ordinary drawn paths instead
of being limited to geometric shapes and text.

- ✅ `dream.add_stroke` appends brush, pencil or eraser marks to the top active
  layer or an exact id/name target using 2–10,000 finite ordered samples.
- ✅ Optional pressure samples use the same bounded width multipliers as pen
  input. Color, size and opacity are validated before any write; pencil and
  eraser remain fully opaque like their human-operated equivalents.
- ✅ Animated documents keep the active-frame mirror coherent and return the
  operation id plus stable layer facts for the agent's next action.
- ✅ Real-file tests cover pressure, defaults, id/name targeting, tool semantics,
  every invalid input class and animation. The example and live MCP protocol
  render the authored path into a real PNG.
- Acceptance met: an agent creates, reopens and renders a portable freehand
  mark while malformed or oversized input leaves the project unchanged.

## Slice 44 — Interaction truth and discoverability ✅

Persona need: let every creator understand available actions and prerequisites
at the point of use, independent of prior product knowledge or browser support.

- ✅ Styled tooltips escape scrolling toolbar and rail boundaries instead of
  becoming fully opaque while remaining physically clipped.
- ✅ AI Edit states that no selection means a whole-layer edit and offers one
  direct **Select a part** action that enters Design with Select active.
- ✅ The global voice mic remains visible without speech recognition and
  explains the working touch, mouse and keyboard paths.
- ✅ Production-browser coverage proves toolbar/rail tooltip state, the complete
  selection handoff, unavailable voice feedback and a successful spoken story.
- ✅ Local release gates are green: main checks, 97.74% engine coverage,
  42 browser journeys, 24 MCP tests, four honest agent evals and both MCP
  core/protocol round-trips.
- ✅ GitHub Pages and all CI jobs completed successfully; a cache-bypassed public
  browser proved both tooltips, whole-layer guidance, Design + Select handoff,
  selected-only editing and unavailable-voice feedback on commit `6b517e7`.

## Slice 45 — Predictive direct manipulation ✅

Persona need: let Aleksandr—and every mouse, trackpad or stylus creator—know
what a gesture will do before committing it, and what it is doing during drag.

- ✅ Select hover previews the exact topmost object while empty canvas, objects,
  corner resize handles, rotation, locked layers and active drags use distinct
  pointer states.
- ✅ Pan and whole-layer Move transition from open to closed hand; magic-wand
  dragging, text, fill, stamp, playback and Alt-modified zoom have truthful
  cursors.
- ✅ Component and image drags turn the canvas into a named copy/import target;
  unsupported content gets a named refusal state and changes nothing.
- ✅ Every remaining panel and timeline control now uses the same unclipped
  styled-tooltip contract as the toolbar and rail instead of native browser
  titles; browser coverage proves all four placement directions.
- ✅ Focused production-browser tests prove hover chrome, cursor transitions and
  component/image/invalid drag states. Full gates remain green: 837 unit tests,
  97.74% engine coverage, 44 browser journeys, 24 MCP tests and four honest
  evals.

## Slice 46 — Truthful AI progress and cancellation ✅

Persona need: keep Zainab, George and every connected-AI creator oriented and
in control when generation is slower than a direct manipulation.

- ✅ Create, Edit and Feedback show a subtle indeterminate activity track with
  action-specific copy that becomes more candid as the wait lengthens; no fake
  completion percentage is shown.
- ✅ Cancel returns the panel to a ready state immediately, asks a compatible
  network request to abort and confirms that the document stayed unchanged.
- ✅ A provider that ignores cancellation still cannot apply a late picture,
  edit or critique after the person has cancelled.
- ✅ Progress announcements are polite for assistive technology, motion follows
  the global reduced-motion contract, and all messages are localized in six
  languages.
- ✅ Unit coverage proves request-signal forwarding, native cancellation error
  preservation, staged progress, immediate cancellation and late-result refusal.
- ✅ Full release gates remain green: 839 unit tests, 97.74% engine coverage,
  45 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 47 — Voice understands the selected “it” ✅

Persona need: let Zainab and George speak about the thing they can already see
instead of learning that every phrase controls a hidden tool setting.

- ✅ With artwork selected, “make it bigger” and “make it smaller” resolve “it”
  to the selection, scale the complete group about its shared center and name
  that result in spoken/visible feedback.
- ✅ With no selection, the established brush-size behavior remains exact. A
  locked selection gets a truthful refusal and never falls through to changing
  the brush.
- ✅ Selection scaling is one undoable document action and works across every
  selectable object type through the same transformation contract as handles.
- ✅ Contextual feedback is localized in all six languages; focused store and
  voice-executor tests cover scaling, undo, reference choice and lock refusal.
- ✅ Full release gates remain green: 841 unit tests, 97.74% engine coverage,
  46 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 48 — Voice corrections keep the intended action ✅

Persona need: let a person repair what they just said naturally instead of
having a leading yes/no silently consume the command that follows it.

- ✅ Yes and no act as confirmation only when every meaningful word is an
  answer, so “yeah sure” still confirms while “no, undo that” runs Undo and
  “yes, make it red” chooses red.
- ✅ The same rule applies across localized vocabularies; an Arabic “no, undo”
  correction reaches Undo rather than becoming a bare cancellation.
- ✅ Existing clear-layer safety remains exact: a standalone yes confirms, a
  standalone no cancels, and a mixed new command abandons the pending clear
  before running safely.
- ✅ Pure parser tests cover affirmative, negative and mixed corrections without
  relying on a speech service or network.
- ✅ Full release gates remain green: 841 unit tests, 97.74% engine coverage,
  46 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 49 — Sparse tactile interaction cues ✅

Persona need: let touch-device creators feel a decisive interaction boundary
without turning every brush movement into noise or making touch feedback the
only way to understand what happened.

- ✅ The first visible valid canvas drop target gets one short tactile cue on
  supported hardware; the visible invalid target gets a distinct double cue.
- ✅ Repeated drag events do not repeat a cue, drawing never vibrates, and the
  named canvas state remains the primary feedback in every case.
- ✅ Touch feedback has a plain-language setting, defaults on, persists locally
  and becomes a harmless no-op on unsupported hardware.
- ✅ Reduced-motion preference and the off setting both keep tactile output
  silent; focused unit and production-browser coverage prove patterns,
  suppression and the user control.
- ✅ Full release gates remain green: 845 unit tests, 97.74% engine coverage,
  46 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 50 — Voice acts on the selected “it” ✅

Persona need: let a person continue speaking about visible artwork after
selecting it, without risking that a natural delete phrase clears unrelated
work or that a copy command silently changes a hidden tool setting.

- ✅ “Delete it” and “duplicate it” resolve only to the visible selection;
  deletion and the offset selected copy are each one undoable document action.
- ✅ “Delete everything” remains the separately confirmed whole-layer action,
  while a missing or locked selection receives specific spoken/visible guidance
  and changes nothing.
- ✅ Natural equivalents work in English, Arabic, Persian, Simplified Chinese,
  Brazilian Portuguese and Russian, and every locale’s Help names them.
- ✅ Pure parser and executor coverage proves intent separation and safety; a
  production-browser journey draws, selects, scales, copies and deletes through
  the microphone path while checking rendered canvas changes.
- ✅ Full release gates remain green: 852 unit tests, 97.74% engine coverage,
  46 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 51 — Provider checks stay cancellable ✅

Persona need: let a creator verify an unfamiliar AI endpoint without wondering
whether Dream froze, being trapped behind a slow service or having a late reply
contradict a cancellation.

- ✅ Test connection names contacting, checking and patient-waiting stages with
  honest indeterminate activity instead of inventing a completion percentage.
- ✅ Cancel returns Settings to ready immediately, forwards an abort signal,
  confirms settings stayed unchanged and refuses a late hello from becoming a
  success result.
- ✅ Save cannot race an active test; URL, model and key remain editable before
  the next attempt, and no key enters notices, logs or persistent settings.
- ✅ Focused component and production-browser coverage proves staged copy,
  request cancellation, immediate readiness and late-result rejection.
- ✅ Full release gates remain green: 853 unit tests, 97.74% engine coverage,
  47 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 52 — Real Code stays observable and cancellable ✅

Persona need: let an app creator understand a slow code-generation wait, leave
it immediately and trust that a provider cannot surprise them with a download
after they said stop.

- ✅ Real Code distinguishes screen/image preparation, provider writing,
  offline-safety checking and a patient longer wait without a fake percentage.
- ✅ An indeterminate loader remains visible and accessible while the active
  format is fixed, preventing the dialog from changing meaning mid-operation.
- ✅ Cancel makes the dialog ready immediately, forwards request cancellation,
  confirms no file downloaded and rejects late replies before download.
- ✅ Focused generation and production-browser coverage prove signal forwarding,
  stage order, immediate cancellation and late-download rejection.
- ✅ Full release gates remain green: 854 unit tests, 97.74% engine coverage,
  48 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 53 — Project opening protects current work ✅

Persona need: let a creator open a large saved or portable project without
wondering whether Dream froze or risking an unwanted late switch away from the
work already on screen.

- ✅ Opening names reading, image/layer/frame restoration and a patient longer
  wait with an accessible indeterminate loader rather than a fake percentage.
- ✅ Project, delete, file-picker and backdrop actions cannot race an active
  open; the visible Cancel action returns the dialog to ready immediately.
- ✅ Cancellation preserves the current project and rejects a late saved-project
  or file result before it can change the canvas or last-project pointer.
- ✅ Focused component coverage proves immediate cancellation, locked competing
  actions, late-result rejection and a plain saved-project failure path.
- ✅ Full release gates remain green: 856 unit tests, 97.74% engine coverage,
  48 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 54 — Component drags preview the result ✅

Persona need: let a fast visual creator see exactly what a reusable component
will become and where it will land before committing the copy.

- ✅ The native pointer ghost is the component's clean thumbnail rather than
  the whole library card, centered under the pointer with familiar copy intent.
- ✅ Inside the canvas, a translucent exact-scale rendering follows the eventual
  centered origin, outlined without hiding the underlying composition.
- ✅ Passive status feedback names the component; invalid/image feedback remains
  distinct, and leaving, cancelling or dropping clears all preview state.
- ✅ Release uses the same carried component and origin the preview showed, then
  preserves the established new-layer, selected-instance and undo contracts.
- ✅ A production-browser journey creates, carries, previews and drops a real
  component while checking named feedback, rendered pixels and the new layer.
- ✅ Full release gates remain green: 857 unit tests, 97.74% engine coverage,
  49 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 55 — Components never require dragging ✅

Persona need: let keyboard, switch-control and precision-limited creators reuse
their work without needing a double-click or spatial drag gesture.

- ✅ Every component card exposes a persistent, named Insert control; its native
  button works by keyboard or pointer and explains that insertion is centered.
- ✅ The copy preserves the established own-layer, selected-result and exact
  undo behavior, while spatial drag-and-drop remains available beside it.
- ✅ Keyboard focus reveals the sibling delete action just as pointer hover does,
  so card actions do not disappear for non-pointer users.
- ✅ Focused component coverage proves insertion state and a production-browser
  journey activates the control with Enter after completing a real drag.
- ✅ Full release gates remain green: 858 unit tests, 97.74% engine coverage,
  49 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 56 — Rotation explains itself ✅

Persona need: let a precise visual creator trust the angle that will be
committed without estimating from the box or discovering constraints by error.

- ✅ A stable badge beside the pointer reports the effective signed angle and
  distinguishes free rotation, Shift's 15° snap and required 90° steps.
- ✅ The readout is driven by the same effective transform as the preview, so
  its promise and the undoable result cannot disagree.
- ✅ Optional Touch feedback adds a tiny detent only when a snapped step changes;
  free rotation, repeated movement within a step, disabled feedback, unsupported
  hardware and reduced-motion preferences remain silent.
- ✅ Store and haptic tests cover exact modes and patterns; a production-browser
  journey proves the 15° badge, tactile boundary and cleanup after release.
- ✅ Full release gates remain green: 859 unit tests, 97.74% engine coverage,
  49 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 57 — Voice can recolor “it” ✅

Persona need: let a child or low-literacy creator correct the visible thing in
ordinary speech without accidentally changing an invisible brush setting.

- ✅ “Make it red” and equivalent referential phrases in all six locales carry
  explicit selection intent; a bare color remains the current drawing color.
- ✅ Editable strokes, shapes and text recolor as one undoable document action.
  Missing and locked selections get contextual refusals, while raster pixels
  are honestly directed to AI Edit instead of receiving false success.
- ✅ Full release gates remain green: 861 unit tests, 97.74% engine coverage,
  49 browser journeys, 24 MCP tests and four honest agent evals.
- ✅ Spoken and visible feedback names the resulting color in the active locale.
  Parser, executor, store and locale tests cover the context boundary.
- ✅ A production-browser voice journey selects real artwork, says “make it red”
  through speech recognition and proves both the feedback and painted pixels.

## Slice 58 — Story batches stay legible and cancellable ✅

Persona need: keep a child, low-literacy creator or impatient professional in
control while several remote pictures are painted one after another.

- ✅ Determinate progress names the exact reviewed moment, fills only as frames
  complete, and visually distinguishes the current and completed moments.
- ✅ Cancel and Escape remain available throughout painting, return the dialog
  to a ready reviewed plan immediately and confirm that nothing changed.
- ✅ The active painter receives a stop signal; providers that ignore it cannot
  advance to later moments or land a partial or late frame batch.
- ✅ Focused tests prove ordered scene progress, signal forwarding, immediate
  cancellation and late-result refusal without any document mutation.
- ✅ Full release gates remain green: 863 unit tests, 97.74% engine coverage,
  50 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 59 — Video recording can stop safely ✅

Persona need: let Ahmed and every social-video creator stop a long delivery
without waiting helplessly or discovering a misleading partial download.

- ✅ WebM and supported MP4 expose determinate completed-frame progress while
  freezing the settings that define the active recording.
- ✅ Cancel and Escape stay available, stop the recorder and narration mix
  immediately, and never assemble or download a partial video.
- ✅ Cancellation feedback says that caption edits remain, while frames, trim,
  aspect and every other delivery choice stay untouched.
- ✅ Unit coverage proves prompt recorder cleanup and no later frames after an
  abort; a production-browser journey proves no download after cancellation.
- ✅ Full release gates remain green: 864 unit tests, 97.74% engine coverage,
  51 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 60 — Voice can position “it” ✅

Persona need: let a child or low-literacy creator arrange the visible thing in
ordinary spatial language without learning drag mechanics or layout jargon.

- ✅ “Move it left/right/up/down” and “center it” resolve only to the visible
  selection, with natural equivalents in all six locales and English retained
  in every locale.
- ✅ Directional moves use the same predictable 10 px coarse step as keyboard
  nudging; centering uses the true canvas center. Each request is one undoable
  document action and names its result.
- ✅ Missing and locked selections receive specific guidance, while a bare
  direction is treated as ambiguous and leaves artwork, brush and history
  unchanged.
- ✅ Parser, executor and store boundaries prove direction mapping, locale
  normalization, exact movement, centering, lock refusal and undo behavior. A
  production-browser voice journey proves real selected pixels move.
- ✅ Full release gates remain green: 866 unit tests, 97.74% engine coverage,
  51 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 61 — Voice understands canvas edges ✅

Persona need: let a child or low-literacy creator express layout intent—“put it
at the top”—without translating that thought into repeated nudges or drag
precision.

- ✅ Natural left, right, top and bottom edge requests resolve only to the
  visible selection, with equivalent phrases in all six locales and English
  retained everywhere.
- ✅ The selected artwork's shared visual bounds land flush with the named
  canvas edge as one undoable action. Edge placement remains distinct from the
  predictable 10 px meaning of “move it right.”
- ✅ Missing and locked selections receive truthful, task-specific guidance and
  never change artwork, brush or history.
- ✅ Parser, executor and store tests prove intent separation, every edge,
  localized phrasing, exact geometry, refusal and undo. A production-browser
  speech journey proves selected pixels move toward the requested edge.
- ✅ Full release gates remain green: 869 unit tests, 97.74% engine coverage,
  51 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 62 — “Again” is conversational and safe ✅

Persona need: let a child or low-literacy creator refine placement naturally—
“move it right… again”—without making an ambiguous word dangerous.

- ✅ “Again”, “a little more” and natural equivalents in all six locales repeat
  only the immediately preceding successful directional 10 px nudge.
- ✅ The one-turn, session-only context clears after any other command, unknown,
  failed or empty listen, missing/locked selection, centering or edge placement.
- ✅ Destructive commands, duplication, color, size, clearing, export and every
  other non-nudge action are categorically ineligible for ambiguous repetition.
- ✅ Parser and executor tests prove every locale, successful continuation,
  interruption clearing, no-context refusal and failed-nudge clearing. A
  production-browser speech journey proves two successive spoken nudges move
  real selected pixels twice.
- ✅ Full release gates remain green: 871 unit tests, 97.74% engine coverage,
  51 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 63 — Selection snapping feels decisive ✅

Persona need: let a precise mouse, pen or touch creator feel and see the exact
alignment boundary without watching coordinates or receiving constant noise.

- ✅ A compact pointer-side confirmation reinforces the existing exact accent
  guide while a dragged selection is snapped.
- ✅ Entering a new guide produces one tiny optional tactile detent on supported
  hardware; repeated movement along the same guide stays silent.
- ✅ The existing Touch feedback setting, unsupported-hardware behavior and
  reduced-motion preference keep tactile output optional and harmless.
- ✅ A production-browser journey proves the visible confirmation, one-detent
  boundary and cleanup after release.
- ✅ Full release gates remain green: 871 unit tests, 97.74% engine coverage,
  52 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 64 — The phone toolbar follows human priority ✅

Persona need: let a new-phone or low-literacy creator find creation, recovery
and workspace choices immediately instead of scanning a desktop toolbar
sideways.

- ✅ At 390 px, identity, Story, AI, voice, Undo, Settings and all four named
  workspaces remain visible in stable positions with no horizontal scrolling.
- ✅ New, Open, Save, Import, Resize, Export, Animate, Redo and Little Dreamer
  remain fully available through one labelled, viewport-contained More tray.
- ✅ The tray closes after an action or outside press; Escape closes it and
  returns focus. Localized labels, RTL logical placement, reduced motion and
  44 px comfort targets preserve the existing accessibility contracts.
- ✅ Production-browser coverage checks the closed shell, every disclosed
  action, viewport containment, focus recovery, export route and serious
  accessibility violations. A rendered 390×844 pass verifies both states.
- ✅ Full release gates remain green: 871 unit tests, 97.74% engine coverage,
  53 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 65 — Phone editing keeps depth without the desktop rail ✅

Persona need: let George create one-handed on his new phone and let any phone
creator find Select, every tool and advanced control without sacrificing canvas
width or knowing that a desktop sidebar exists.

- ✅ Adult Draw and Design use a non-scrolling six-place bottom dock. The active
  tool stays visible beside mode-priority tools, Controls and All tools; Design
  always keeps Select direct.
- ✅ All tools opens the complete mode-eligible palette in a labelled grid and
  keeps a newly selected tool in the dock. Controls restores Options, Adjust,
  Layers, Design, Links and Components as each becomes applicable.
- ✅ The visible phone AI action now opens a visible Dream AI panel inside the
  same controls sheet instead of toggling a hidden desktop sidebar.
- ✅ Sheets are viewport-contained, scrim-backed and transform/opacity-only;
  selection closes the tool grid, while Escape closes either surface and
  returns focus. Six locales, RTL, reduced motion and comfort targets remain
  first-class.
- ✅ Production-browser coverage proves the 390 px no-scroll dock, all 16 Draw
  tools, sticky active tool, direct Design selection, conditional panels, AI
  destination, focus recovery and serious accessibility scan. Rendered dock,
  tool-grid and controls-sheet states were inspected directly.
- ✅ Full release gates remain green: 871 unit tests, 97.74% engine coverage,
  54 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 66 — Voice shows its work and never becomes a dead button ✅

Persona need: let Zainab and George know when Dream is listening, verify what it
heard and recover when a browser or microphone cannot recognize speech.

- ✅ The toolbar mic opens a compact conversation on desktop and phone, with an
  explicit listening state, live transcript, interpreted phrase and result.
- ✅ Stop and Speak again remain direct; outside press and Escape dismiss the
  surface, Escape restores focus, and opening the reviewed story journey closes
  the voice surface before transferring attention.
- ✅ Unsupported recognition, denied permission, unheard input and recognition
  errors receive localized, nontechnical explanations. Typing reaches the exact
  same localized intent rules, so the visible mic never ends in a dead end.
- ✅ A causal five-bar listening waveform scales without moving layout, all
  meaning is duplicated in text, dynamic results are announced and reduced
  motion collapses the animation.
- ✅ Production-browser coverage proves live listening/transcript/story handoff,
  the phone fallback and typed command path, focus recovery and serious
  accessibility scans. The rendered 390×844 fallback state was inspected.
- ✅ Full release gates remain green: 872 unit tests, 97.74% engine coverage,
  55 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 67 — Voice asks instead of guessing ✅

Persona need: let Zainab and George speak an incomplete instruction naturally,
understand the missing choice and finish it without restarting or risking an
unexpected edit.

- ✅ With editable selected artwork, “move it” changes nothing and asks whether
  to move left, right, up or down. Missing and locked selections keep their
  existing truthful guidance instead of opening an impossible follow-up.
- ✅ The next one-word direction works through speech or typing in English,
  Arabic, Persian, Simplified Chinese, Brazilian Portuguese and Russian. The
  resolved 10 px nudge becomes the one safe action that “again” may repeat.
- ✅ Four compact, labelled direction choices provide a visible touch, mouse
  and keyboard route. Unknown answers repeat the question, Cancel cancels, and
  another valid command replaces the pending question.
- ✅ Browser coverage proves no movement before the answer, a spoken follow-up,
  the visible-choice path, repair behavior and serious accessibility scans.
- ✅ The rendered 390×844 review keeps the four-way control clear and catches
  the unsupported-mic explanation escaping into an oversized toolbar tooltip;
  the tooltip now stays a compact action label while the full message remains
  in the conversation.
- ✅ Full release gates remain green: 875 unit tests, 97.74% engine coverage,
  55 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 68 — The first drawing teaches direct editing ✅

Persona need: let George discover how to move or change what he just made
without first decoding workspace architecture, while leaving experienced
people and Little Dreamer alone.

- ✅ After the first successful adult drawing gesture, one compact localized
  invitation asks whether to move or change it and offers Select it directly.
  It never appears for an empty gesture, restored artwork or Little Dreamer.
- ✅ Select it enters the ordinary Design/Select workspace with exactly the new
  marks selected. The handoff creates no document-history step: one Undo still
  removes the drawing itself.
- ✅ Selection receives one optional sparse tactile confirmation only after the
  visible selection succeeds. The card uses a short transform/opacity entrance,
  reduced motion makes it effectively instant and phone actions are 44 px.
- ✅ Selection or Close persists the lesson per device; continuing to draw or
  finding Design independently also dismisses it permanently.
- ✅ Browser coverage proves selection, one-step Undo, persistence, haptics,
  390 px containment and serious accessibility scans. The settled phone render
  was inspected directly.
- ✅ Full release gates remain green: 877 unit tests, 97.74% engine coverage,
  57 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 69 — Game collisions feel physical, not noisy ✅

Persona need: let Zainab feel a meaningful phone-game impact even when sound is
muted, without making ordinary play distracting or tiring.

- ✅ Catch!, Flappy Dream and Dream Jumper map only their life-losing collision
  event to one short optional impact synchronized with the existing visible
  shake, life change and sound.
- ✅ Movement, jumping, flapping, scoring and wins remain silent. A collision
  that also ends the run produces one impact rather than a collision pulse plus
  a second game-over pulse.
- ✅ Touch feedback off, unsupported hardware and reduced motion remain silent;
  gameplay state and timing never depend on tactile support.
- ✅ Focused tests prove mapping, deduplication and silence boundaries. A seeded
  production-browser journey drives a real centered bad catch and observes
  exactly one impact.
- ✅ Full release gates remain green: 879 unit tests, 97.74% engine coverage,
  58 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 70 — Layers combine like real creative media ✅

Persona need: let Ali, Fatima, Sara, Zǐxuān and Aleksandr shade, light, texture
and compose without baking away editability or burdening Draw with pro chrome.

- ✅ The active layer offers Normal, Multiply, Screen, Overlay, Darken and
  Lighten beside opacity only in Design. Changes render immediately and remain
  ordinary one-step undoable document edits.
- ✅ Each affected layer is flattened before it combines with visible artwork
  below, so canvas, cached rendering, raster delivery, animation, prototypes and
  honest SVG use the same compositing model.
- ✅ The mode persists through `.dream`, older or absent values recover to
  Normal, and the agent surface lists and validates the same six values when
  configuring a layer.
- ✅ Engine, cache, history, portable-file, SVG and agent tests prove the
  contract. A real browser draws overlapping primary colors, observes exact
  Normal and Multiply pixels, and proves Undo restores both pixels and control.
- ✅ Full release gates remain green: 883 unit tests, 97.18% engine coverage,
  59 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 71 — Live edits keep their visual promise ✅

Persona need: let mouse, pen and touch creators trust what they see during a
gesture, especially after professional layer effects make approximate previews
visibly misleading.

- ✅ In-progress drawing, whole-layer movement, selection transforms,
  adjustment previews and wand movement stay in the owning layer instead of
  being painted as temporary topmost chrome.
- ✅ Real stack order, opacity and blend mode therefore apply before release or
  Apply; committing no longer changes color or unexpectedly jumps behind
  content that was supposed to remain above it.
- ✅ A real browser holds a blue stroke and then a moved blue layer over red
  while Multiply is active, observes black pixels before pointer-up, and proves
  the same exact results plus independent Undo after commit.
- ✅ Full release gates remain green: 883 unit tests, 97.18% engine coverage,
  59 browser journeys, 24 MCP tests and four honest agent evals.

## Slice 72 — Editable layer adjustments ✅

Persona need: let Ali and every experimenting creator change the mood of work
without sacrificing the real strokes, shapes, type or pixels they may need to
refine later.

- ✅ Brightness, contrast, saturation, hue, grayscale, sepia, invert, blur and
  sharpen now save as editable active-layer settings. Apply is one undoable
  decision, Cancel restores the last saved appearance, Reset remains a preview
  and a visible Editable explanation makes the preservation promise explicit.
- ✅ The effect applies to the layer's flattened appearance before blending, so
  original operations and future marks stay independently editable while
  canvas, cached rendering, raster delivery, animation and prototypes agree.
- ✅ Settings survive `.dream`, older or malformed values recover safely, and
  agent layer read/write exposes the complete validated contract. Honest SVG is
  withheld for a visible non-neutral effect rather than approximating pixels.
- ✅ A real browser applies grayscale to a native red stroke, adds and undoes a
  later blue stroke beneath the saved effect, previews Reset, cancels back to
  the saved effect and finally undoes only the adjustment.
- ✅ Full release gates remain green: 888 unit tests, 97.54% engine coverage,
  60 browser journeys, 25 MCP tests and four honest agent evals.

## Strict 10/10 priority sequence

The next slices are ranked against the personas' latent jobs, not by adding the
largest count of controls:

1. **Direct-manipulation foundation:** cursor semantics, hover/hit feedback,
   valid/invalid targets, post-drop selection and cancellable AI progress are
   established, including provider checks, code generation, project opening and
   item-level story/video progress. A one-time first-drawing invitation now
   bridges Draw into real object editing; continue with other operations where
   multi-item work or advanced destinations can become opaque.
2. **Conversational phone-first creation:** natural clarification and reference
   handling for voice now covers selected-object identity, color, size, basic
   position, canvas-edge targets and a bounded missing-direction follow-up.
   Listening, transcription, results, retry and the identical typed fallback
   are visible; continue with relationships between objects, broader
   clarification and repair, literacy-light controls and export beyond the
   task-prioritized shell/dock, and a faithful safe creation path that does not
   require a child or low-literacy user to configure an AI provider.
3. **Professional substrate:** core portable layer blending and editable
   per-layer adjustments are established; continue with masks, effect stacks
   and color foundations, then vector paths, typography, grids, constraints and
   linked reusable systems—progressively disclosed without crowding first-minute
   Draw.
4. **Outcome-grade delivery:** publication preflight for scientific figures,
   professional brand/print export, and short-video audio/caption/safe-zone
   control.
5. **Agent completeness:** typed structured MCP results, side-effect annotations,
   resources/prompts and remaining content operations; public registry release
   still requires explicit approval.
