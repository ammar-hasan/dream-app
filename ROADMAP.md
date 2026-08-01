# Roadmap

Dream ships in slices. Slice 1 (core drawing app + harness), slice 2 (image
editing), slice 3 (design mode), slice 4 (animation + video export +
presentation mode), slice 7 (AI panel) and the accessibility trio — slices 8
(voice commands), 9 (kid mode) and 10 (i18n) — are done. Each slice below
lists brief acceptance criteria; slices are roughly ordered by dependency,
not by a fixed schedule.

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

## Slice 11 — PWA

- ✅ Basics shipped in the polish pass: web app manifest, SVG icon
  (maskable), theme colors.
- Remaining: offline-first service worker, document library available offline.
- Acceptance: Lighthouse PWA checks pass; app works fully with network off.

## Slice 12 — Games & app generation

- Conversational flow that turns drawings/animations into playable mini-games and
  simple apps; MCP/API hooks for developer workflows (persona: Maria).
- Acceptance: user sketches a character, describes a game in one sentence, and plays
  the result in-app.
