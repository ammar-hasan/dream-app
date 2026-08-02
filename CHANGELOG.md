# Changelog

All notable changes to Dream are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] - 2026-08-01

First public release: a complete, free, browser-only design app — as simple
as MS Paint, as deep as Photoshop, AI-assisted, and usable by anyone from a
5-year-old to a 90-year-old.

### Added

- Core drawing: brush, pencil, eraser, line/rectangle/ellipse with
  Shift-constrain, flood fill, eyedropper, text tool, 200-step undo/redo,
  zoom & pan, layers (add/delete/rename/reorder/visibility/opacity/lock).
- Image editing: import via picker/drag-drop/paste, per-layer filters
  (brightness, contrast, saturation, hue, grayscale, sepia, invert, blur,
  sharpen) with live preview and presets, move/flip/rotate, crop & resize,
  flattened PNG/JPEG export.
- Design mode: click/shift-click/marquee selection with bounding-box handles,
  move/scale/rotate, snapping guides, group/ungroup, align & distribute, and
  a cross-project component library (IndexedDB) with live thumbnails.
- Animation: flipbook frames with per-frame layer stacks, onion skinning,
  1–24 fps playback, WebM video export, PNG sprite-sheet export, and a
  Present mode that turns frames into fullscreen slides.
- AI panel: Create/Edit/Feedback tabs driven by the built-in deterministic
  Dream AI (20 free tries/day) or any OpenAI-compatible BYOK endpoint; API
  keys in sessionStorage by default, never logged; voice dictation for
  prompts.
- Accessibility for everyone: Little Dreamer (kid) mode with giant tools and
  spoken names, hands-free canvas voice commands ("undo", "fill red", "new
  frame"…), full i18n with English and Arabic (RTL shell mirroring).
- Design system: token-driven light & dark themes, brand mark, splash,
  welcome card, tooltips, floating zoom pill — all motion respects
  `prefers-reduced-motion`.
- Release harness: Playwright e2e smoke suite + visual baseline, release
  script, PWA icons, and GitHub Pages deployment.

[0.1.0]: https://github.com/ammarhasanrizvi/dream-app/releases/tag/v0.1.0
