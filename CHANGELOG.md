# Changelog

All notable changes to Dream are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Scientific connectors and scalable delivery** (slice 34): the Line tool
  now draws plain, arrow-ended or two-way connectors, and the Text tool offers
  caret-aware subscripts, superscripts, arrows and common science symbols.
  Vector-safe visible work exports as genuine SVG with authored geometry,
  layer/mark opacity, pressure-width strokes, deterministic spray, text and
  connector heads intact. Visible pixel edits or erasure disable only SVG and
  explain the working PNG fallback instead of producing a misleading file.
  The principal-UX pass also fixed text placement immediately dismissing its
  own focused input and moved first-run guidance out of the writing path.

- **Persian calligraphy path** (slice 33): فارسی joins English and Arabic as a
  complete parity-checked RTL interface with Iranian Persian recognition,
  spoken feedback, canvas commands and local storyboard sequencing. The Brush
  adds a fixed-angle broad Calligraphy nib whose direction creates authentic
  thick/thin rhythm with mouse or touch and combines with stylus pressure; the
  Text tool adds a Persian-script font stack. A rendered principal-UX pass also
  found and fixed the Settings popover being clipped after an RTL switch and
  corrected its form semantics; locale parity now guards interpolation
  placeholders too, correcting two older Arabic count messages. AI, story,
  export, presentation and game
  surfaces now load on demand, keeping the production entry bundle at 472.84 kB
  after the third full language table.

- **Synchronized video trimming** (slice 32): WebM and MP4 export now offer an
  inclusive Start frame / End frame range with live duration and range-based
  progress. Only the delivery is trimmed; source frames, order, captions and
  undo history remain untouched, and each reopened Export dialog defaults to
  the whole animation. Narrated exports start audio at the selected frame's
  exact time offset and stop it with the video. The export dialog now loads on
  demand, bringing the production entry bundle back to 493.45 kB.

- **Private no-backend prototype links** (slice 31): animated app prototypes
  can now be copied as a compressed, self-contained URL that opens directly in
  the standalone viewer. The link carries only flattened PNG screens, valid
  hotspots, title, size and start screen—never editable/hidden layers, speaker
  notes, captions, narration, game state or AI settings. Incoming data is
  strictly bounded and validated before safe viewer HTML is rebuilt; malformed
  links fall back to Dream with a friendly warning. Links over 100,000
  characters or 2 MB expanded are refused in favor of the Interactive app
  file, and clipboard failure leaves a selectable URL. The codec is loaded only
  on demand so the production entry bundle remains below 500 kB.

- **Phone timeline task focus** (slice 30): the adult phone timeline now keeps
  frames and their add/duplicate/reorder/delete actions visible while an
  Animate / Slides / App switch reveals only the controls for the current
  job. Animate contains playback, narration, speed, looping and onion skin;
  Slides exposes the current slide settings; App offers linking first and
  preview once links exist. Desktop behavior and Little Dreamer's simpler
  animation path stay unchanged. A 390 px interaction test, serious/critical
  accessibility scan and three-state visual review cover the responsive flow.

- **Private synchronized Presenter window** (slice 29): Presenter now opens a
  true second-window console instead of placing speaker notes over the audience
  stage. It shows current and next slide previews, private notes, session time,
  authored timing and a live countdown; Previous, Next and Auto control the
  audience in sync, with actions to focus the audience, close only the console
  or exit the show. Keyboard control follows whichever window has focus.
  Closing or blocking the popup never interrupts the audience and never exposes
  notes; blocked popups get a friendly instruction. The console reuses both
  themes, RTL and the automated accessibility floor.

- **Voice-to-storyboard animation** (slice 28): Story in the adult toolbar and
  the large Little Dreamer “Tell a story!” action turn one English or Arabic
  spoken/typed idea into two to six reviewable moments. Planning is local,
  deterministic and document-safe; moments can be edited, added, removed,
  replanned and read aloud before confirmation. Kid dictation plans
  immediately and action names are spoken. The active image-capable provider,
  or a clearly named Dream AI fallback, paints the reviewed sequence in order
  with whole-story continuity instructions. The all-or-nothing captioned frame
  batch preserves existing art, starts a new flipbook slowly, dismisses
  first-run onboarding before showing the result, and is removed by one Undo.
  One complete Dream AI story spends one free try; BYOK painting is unlimited.
  Global English/Arabic story commands open the same prefilled plan.

- **Social-ready video export** (slice 27): WebM and natively supported MP4
  exports can now be Original, Vertical 9:16, Square 1:1 or Landscape 16:9 at
  720p. Dream contains the complete canvas without cropping or stretching,
  requests a smooth 30 fps recording stream while preserving the chosen
  flipbook timing, and names shaped files clearly. Every frame can carry a
  160-character caption, edited while exporting with previous/next and
  copy-to-all controls, burned over a readable safe-area backing and saved as
  one undoable project edit. Captions also appear in Slide settings and the
  timeline. EN/AR copy, exact request/geometry tests and a real browser video
  proof ship together.

- **Real image fidelity in AI paths:** OpenAI-compatible settings now expose a
  separate image-generation model. The official OpenAI endpoint defaults a
  blank value to `gpt-image-2`, sends a supported low-cost draft request
  without the legacy response-format field, and normalizes the returned image
  to Dream's exact canvas. Real Code exports now embed imported and AI-made
  raster pictures as inline PNG image elements instead of placeholder boxes,
  keeping both local and BYOK output self-contained. Live OpenAI calls and
  deterministic browser tests cover generation, decoding and painted pixels.

- **Automated accessibility gate** (slice 26): browser checks now scan Draw,
  Design, Play, slide settings and Presenter for serious/critical violations.
  The first strict run found six light-theme contrast failures; secondary text
  is now darker and accent labels/solid controls use dedicated readable tokens,
  clearing WCAG AA without changing accent fills or borders. The gate runs with
  the existing end-to-end suite and adds no production dependency.

- **Native MP4 animation export** (slice 25, completing slice 5): animated
  documents gain an MP4 option only when the browser reports native
  `video/mp4` recording support. It reuses the exact frame timing, progress
  and optional narration mix from WebM and always downloads a real `.mp4`
  container—never relabeled WebM. WebM and sprite-sheet paths remain
  unchanged; unsupported browsers see no dead MP4 control. EN/AR copy and
  injectable codec-selection tests ship in parity with no new dependency.

- **Presentation depth** (slice 24, completing slice 6 and research backlog
  #9): each frame can carry an enter transition (none/fade/slide), an optional
  1–60 second auto-advance duration and presenter-only speaker notes. The timeline's
  Slide dialog saves all three as one undoable edit and duplication copies the
  settings. Present mode adds session-only Auto (pauses on untimed/final
  slides) and Presenter controls, with a notes/timing/next-slide panel.
  Legacy decks remain instant and manual; reduced-motion makes transitions
  immediate; EN/AR copy and `.dream` round-tripping ship in parity.

- **Dream Jumper** (slice 23, completing research backlog #2): a fourth Play
  template where the user's hero runs and jumps across a short seeded course,
  collects castable stars and reaches a finish flag. Bounded gaps and height
  changes keep courses approachable; forgiving one-way platforms avoid edge
  snags; falls spend a life and respawn while collected stars stay collected.
  Hero, Collectible, Platforms and Background are castable, with procedural
  stand-ins. The side-scrolling canvas has a following camera, score/lives,
  win/game-over cards, sounds and large kid controls. EN+AR labels and “play
  platformer” / «العب المنصات» voice commands ship in parity, and the offline
  game maker understands run/jump/platform/flag requests.
- **Make a game from words** (slice 22, research backlog #2): the Play panel
  now accepts a short English or Arabic request such as “My Rocket flies
  through Clouds, nice and slow.” Dream deterministically selects Catch!,
  Flappy Dream or Maze Runner, interprets easy/hard, fast/slow, many/few and
  explicit lives/shields, and casts any layers named in the request into
  semantic roles. The visible picker, cast and settings show exactly what was
  understood before the user presses Play. The feature-detected prompt mic
  enables the same flow by voice in the active English/Arabic locale. It is
  fully offline, makes no AI request, spends no free try and never invents
  unsupported mechanics.
- **MCP authoring and registry readiness** (slice 21, research backlog #8):
  `dream.add_layer` and `dream.add_shape` let agents build a named layer with
  validated lines, rectangles and ellipses on the active frame, alongside the
  existing text, inspection, rendering and app-export tools. The demo and
  dogfood flow now exercise the complete authoring round-trip. The standalone
  server is prepared as the scoped public package `@ammar-hasan/dream-mcp`
  with matching `io.github.ammar-hasan/dream-mcp` registry identity, MIT
  license, curated tarball and schema-valid registry metadata. Publishing to
  npm or the registry remains an explicit human-approved step.
- **Generative fill and erase** (slice 20, research backlog #5): BYOK
  OpenAI-compatible providers can opt into `/images/edits` with an edits-model
  setting (current OpenAI example: `gpt-image-2`). Dream sends a PNG image plus
  same-size alpha mask and prompt as multipart data, decodes the base64 result,
  restores every pixel outside the Design-mode selection, and bakes the result
  as one undoable edit. With no selection the whole layer is editable.
  Edits-capable BYOK setups also get one-tap **Erase this**, which removes the
  selected object and fills the gap naturally. Blank edits model means the
  capability stays off; built-in Dream AI remains honestly filter-based. The
  setting persists, keys retain their session-only-by-default rules, and BYOK
  edits remain outside the 20/day free counter.
- **Voice narration** (slice 19, research backlog #4): record one voice take
  over your animation from the timeline's mic button — recording starts
  playback so the timing is natural, with a pulsing red dot, elapsed time and
  live mic level while you talk. Re-recording replaces the take after a
  gentle inline confirm (kid mode skips it and gets a big "Tell the story!"
  mic); takes can be muted (session toggle) or deleted. The take plays in
  sync during editor playback and when a Present session opens (with a small
  indicator + mute there), and the WebM video export now bakes it in as the
  audio track (mixed on-device via WebAudio). One track per document starting
  at time 0 — per-frame tracks deliberately out of scope. The take persists
  with the project (data URL, IndexedDB and `.dream`, outside undo, warning
  over ~10 MB), the mic is asked for on the first record only with friendly
  jargon-free errors, the button hides where recording is unsupported, and
  the narration never leaves the device.
- Voice intents "record narration" / "stop recording" / "delete narration"
  (English) and «سجّل صوتي» / «أوقف التسجيل» / «امسح الصوت» (Arabic) for the
  narration take.

- **AI "make real" code export**: animated documents gain a second app
  export — "Real code (AI) (.html)" — that turns the app description
  (screens, texts, shapes as boxes, the hotspot navigation graph) into a
  real, readable single-file web app instead of a pixel-faithful prototype.
  With a chat-capable BYOK provider the model writes the code (the reply is
  extracted robustly and rejected unless it is one self-contained HTML file
  with no external URLs); with the built-in Dream AI a deterministic local
  template generates the app — free, offline, honestly labeled "generated
  locally by Dream AI" — and counts against the 20/day free tier. Generated
  files are commented, beginner-friendly and start with "Made with Dream —
  where drawings come alive."
- Voice intent "export real code" / "make it real" (English) and «صدّر كود
  حقيقي» (Arabic) for the code export.
- The living spec (`spec/`): an implementation-agnostic, modular product
  specification — concepts, data contracts, per-feature behavior rules,
  experience map, visual identity, integrations, and an acceptance
  checklist — detailed enough to rebuild Dream from the spec alone, in any
  stack. AGENTS.md rule 12 makes spec updates part of every behavior change.
  (The checklist began at 90 points and now contains 127.)
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
