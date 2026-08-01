# Roadmap

Dream ships in slices. Slice 1 (core drawing app + harness), slice 2 (image
editing), slice 3 (design mode) and slice 4 (animation + video export +
presentation mode) are done. Each slice below lists brief acceptance criteria;
slices are roughly ordered by dependency, not by a fixed schedule.

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

## Slice 7 — AI panel with BYOK providers

- UI panel wired to `src/ai` registry: generate image, edit region, get feedback.
- Bring-your-own-key: OpenAI/Anthropic/Gemini/etc. provider configs stored locally;
  Mock provider remains for offline/dev.
- Free-tier hosted quota + unlimited usage with own keys, per the product vision.
- Acceptance: user enters an API key, generates an image onto a layer, asks for
  feedback and gets actionable suggestions; provider errors degrade gracefully.

## Slice 8 — Voice commands

- Hands-free basics: "brush", "undo", "fill red", "new document".
- Acceptance: core drawing flow is drivable by voice with visible command feedback;
  works with mic permission denied (graceful no-op).

## Slice 9 — Kid mode

- Simplified UI preset: giant buttons, fewer tools, friendly sounds, no dialogs that
  require reading.
- Acceptance: a 5-year-old can pick a color and draw with zero literacy; toggle is
  one tap from the toolbar.

## Slice 10 — i18n & accessibility

- String externalization, RTL support, translations for top languages (per personas).
- Full keyboard navigation, ARIA roles, focus management, reduced-motion respect.
- Acceptance: UI switches language at runtime; axe-core audit has no critical issues.

## Slice 11 — PWA

- Installable, offline-first (service worker), document library available offline.
- Acceptance: Lighthouse PWA checks pass; app works fully with network off.

## Slice 12 — Games & app generation

- Conversational flow that turns drawings/animations into playable mini-games and
  simple apps; MCP/API hooks for developer workflows (persona: Maria).
- Acceptance: user sketches a character, describes a game in one sentence, and plays
  the result in-app.
