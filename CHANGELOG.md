# Changelog

All notable changes to Dream are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- The living spec (`spec/`): an implementation-agnostic, modular product
  specification — concepts, data contracts, per-feature behavior rules,
  experience map, visual identity, integrations, and a 90-point acceptance
  checklist — detailed enough to rebuild Dream from the spec alone, in any
  stack. AGENTS.md rule 12 makes spec updates part of every behavior change.
- Play mode game templates: **Flappy Dream** (flap through scrolling gates,
  one hit ends the run, 3 shields in kid mode) and **Maze Runner** (seeded,
  always-solvable generated mazes with level-ups) join **Catch!** behind a
  shared template interface and a picker in the cast panel. Voice: "play
  flappy" / "play maze" / "play catch" in English and Arabic.
- The agent harness: in-repo infrastructure for AI agents developing Dream —
  `CLAUDE.md` bootstrap, four Claude Code subagents (`.claude/agents/`:
  dream-engine, dream-ui, dream-verify, dream-release), three project skills
  (`.agents/skills/`: implement-slice, verify-release, dogfood-mcp), a root
  `.mcp.json` that auto-wires the dream-mcp server for MCP-capable agents, a
  deterministic agent-eval harness (`evals/`, four graded cases,
  `npm run evals`), two bounded continuous-work loops (`LOOPS.md` + `loops/`),
  and the harness map (`docs/HARNESS.md`).
- Stamps: twelve built-in doodle stamps (star, heart, smiley, flower, sun,
  moon, cloud, tree, fish, butterfly, cat, rocket) drawn procedurally by the
  engine — click-to-place at S/M/L sizes, one undo per stamp, ops grouped so
  Design mode moves a stamp as one object. Adult stamp tool (N) with a
  picker in the options panel; kid mode gets a big stamp button in the rail
  with a friendly picker grid and spoken names.
- Starter scenes: three coloring-book outlines ("Sunny garden", "Night sky",
  "Under the sea") generated as engine ops and inserted as a new layer from
  the stamp picker's "Start with a picture" section.
- Comfort mode: a senior-friendly settings toggle (persisted per user) —
  larger text and targets plus a higher-contrast variant of the current
  theme via a `data-comfort` root attribute; composes with dark theme, kid
  mode and RTL.
- Arabic voice commands: the parser now matches per-locale vocabulary
  tables — Arabic commands (تراجع، امسح، إطار جديد، العب لعبتي، colors,
  sizes…) work when the UI is in Arabic, English keeps working everywhere,
  transcripts are normalized for diacritics and alef forms, and speech
  recognition follows the UI locale.
- English "stamp"/"sticker" voice intent.

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
