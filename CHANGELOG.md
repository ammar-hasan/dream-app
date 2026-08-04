# Changelog

All notable changes to Dream are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Exact Design workspace grid** (slice 79): Design can show a session-only
  4–256 px spacing grid and independently snap selection edges/centers to it.
  Full active guides, an exact pointer-side interval label and the existing
  sparse tactile detent make every magnetic move visible; hiding the grid also
  disables its pull, and no line enters artwork, Undo, files or exports.

- **Scoped project-color contrast guidance** (slice 78): every portable named
  color now shows its exact normal-text contrast against the current canvas
  background with an explicit AA or Below AA label. The unrounded 4.5:1
  threshold prevents boundary rounding errors, all six locales share the
  visible contract, and agent summaries expose the same derived facts without
  overstating the result as an artwork, color-vision or print certification.

- **Portable named project colors** (slice 77): color-capable tools can save
  the current color under an editable project name, select, replace or remove
  up to 24 swatches with exact Undo and `.dream` persistence. Device-local
  recents remain separate; existing marks never change. Agents read the same
  list and can add/update/remove entries through two typed tools.

- **Exact paint-tool footprint** (slice 76): Brush, Pencil, Eraser, Spray and
  layer-mask painting now replace the generic pointer over the document with a
  high-contrast exact-diameter ring and center point. It responds to size/zoom,
  vanishes on leave and never enters history or exports.

- **Non-destructive layer masks** (slice 75): Design now offers explicit
  Artwork/Mask and Hide/Reveal targets for pressure-aware painted masks. The
  exact live preview, one-step Undo, enable/delete recovery, transforms,
  frames, `.dream`, raster/prototype output and agent tools share one portable
  contract; painted masks refuse misleading SVG delivery.

- **Voice-accessible steady strokes** (slice 74): spoken or typed steady and
  natural-stroke requests now set the same visible control to 60% or 0% in all
  six languages. Recognition hints, localized results, Help and the no-speech
  typed fallback agree; no hidden state or document-history step is created.

- **Optional steady strokes** (slice 73): Brush, Pencil and Eraser now expose a
  localized 0–100% stabilization control. Zero preserves natural input; higher
  values visibly reduce small wobble while anchoring both endpoints, keeping
  live preview identical to release, preserving pressure/calligraphy and
  remaining one-step undoable. Brush presets disclose their steadiness and
  Spray remains untouched.

- **Editable layer adjustments** (slice 72): the full color/filter set now
  saves as revisitable layer settings instead of flattening original marks.
  Exact live preview, Apply/Cancel/Reset, Undo, `.dream`, raster delivery and
  agent read/write share the same contract; visible adjusted work refuses an
  untruthful SVG, and older projects recover neutral settings.

- **Truthful live layer previews** (slice 71): drawing, whole-layer movement,
  selection transforms, adjustments and wand movement now preview inside the
  owning layer at its real stack position. Opacity and blend modes apply before
  release or Apply, so committing causes no surprise color or stacking jump.

- **Portable layer blend modes** (slice 70): Design now exposes Normal,
  Multiply, Screen, Overlay, Darken and Lighten for the active layer. Blending
  is immediately visible, undoable, saved in `.dream`, preserved in raster and
  honest SVG delivery, and available through the agent layer tools; Draw stays
  unchanged and older projects open as Normal.

- **Tactile game collisions** (slice 69): Catch!, Flappy Dream and Dream
  Jumper now reinforce a visible life-losing collision with one optional short
  impact on supported devices. Movement and scoring stay quiet, simultaneous
  game-over never doubles the cue, and Touch feedback off or reduced motion
  keeps play silent.

- **First-drawing edit invitation** (slice 68): after an adult’s first new
  mark, a localized one-time card asks whether they want to move or change it.
  Select it enters the real Design/Select workspace with exactly those new
  marks selected, adds no Undo step, uses one optional tactile confirmation,
  and never returns after selection or dismissal. Phone actions are 44 px and
  the brief entrance effect disappears under reduced motion.

- **Guided voice movement** (slice 67): with editable artwork selected, “move
  it” now asks which direction and changes nothing until the person answers
  left, right, up or down. The question exposes four touch/keyboard choices and
  accepts the same one-word answer by speech or typing in all six locales;
  unknown answers repeat the question, Cancel cancels, and another valid
  command replaces it safely. A rendered phone audit also keeps the unavailable
  mic explanation inside the conversation instead of clipping it into a long
  toolbar tooltip.

- **Visible, repairable voice conversation** (slice 66): the toolbar mic now
  opens a phone-safe surface with a live transcript, listening waveform,
  interpreted phrase, result, Stop and Speak again. Unsupported recognition,
  denied permission and unheard input stay actionable through the same
  localized intent parser via typing; Escape restores focus and all dynamic
  results are announced accessibly.

- **One-handed phone editing dock** (slice 65): adult phone creation now uses a
  six-place bottom dock that keeps the active/common tools, Controls and All
  tools visible without horizontal scrolling. Select is direct in Design; the
  complete tool set and every applicable editing panel—including the visible AI
  destination—open in labelled, keyboard-safe sheets with localized RTL and
  comfort behavior.

- **Task-first phone toolbar** (slice 64): the adult 390 px shell now keeps
  Story, AI, voice, Undo, Settings and all four workspaces visible without
  sideways scrolling. A labelled, keyboard-safe More tray contains every
  secondary file, animation, recovery and Little Dreamer action, with 44 px
  comfort targets and localized labels in all six languages.

- **Decisive selection snapping** (slice 63): selection drags now pair their
  exact guide lines with a compact pointer-side confirmation and one optional
  tactile detent when entering a new guide. Continuing along the same guide is
  silent, and reduced-motion, disabled or unsupported setups remain unchanged.

- **Safe spoken continuation** (slice 62): immediately after a successful
  directional nudge, “again” or “a little more” repeats that same 10 px move in
  all six locales. The ephemeral context clears on every interruption, failure
  or non-nudge command; ambiguous repetition can never repeat a destructive
  action.

- **Spoken canvas-edge placement** (slice 61): selected artwork now understands
  natural requests to go to the left, right, top or bottom canvas edge in every
  supported locale. Placement uses the shared visual bounds, stays distinct
  from 10 px nudging, is one undoable action, and refuses missing or locked
  selections truthfully.

- **Spoken selection positioning** (slice 60): natural referential commands can
  move selected artwork left, right, up or down by a predictable 10 px step, or
  center it on the canvas, in all six locales. Every result is undoable;
  missing and locked selections are refused truthfully, and bare directions do
  not guess or mutate the document.

- **Cancellable video recording** (slice 59): WebM and supported MP4 export now
  use determinate progress and keep Cancel/Escape available throughout the
  real-time recording. Stopping releases the recorder and audio mix, downloads
  no partial file, and truthfully preserves caption edits.

- **Cancellable storyboard batches** (slice 58): story creation now shows the
  exact scene and completed-frame progress, marks current/completed moments, and
  keeps Cancel and Escape available. Stopping asks the painter to abort and
  guarantees that partial or late frames never reach the document.

- **Voice-selected color** (slice 57): “make it red” now recolors the visible
  vector selection instead of silently changing the brush. Bare colors keep
  their familiar tool-setting meaning; missing, locked and raster selections
  receive truthful guidance across all six locales.

- **Legible rotation feedback** (slice 56): rotation now shows its effective
  angle beside the pointer and distinguishes free, 15°-snapped and 90°-stepped
  behavior. Optional Touch feedback adds one tiny detent when a snapped step is
  crossed, never continuous vibration.

- **Keyboard-equivalent component insertion** (slice 55): every reusable
  component now has a named, focusable Insert control that places a selected,
  undoable copy at the canvas center. Dragging remains available for spatial
  placement, and the delete action becomes visible when keyboard focus enters
  the card.

- **Predictive component drags** (slice 54): dragging a library component now
  carries a clean thumbnail ghost, names the item and paints a translucent
  exact-scale preview at its eventual canvas position. Leaving, cancelling or
  dropping clears the preview; the committed copy remains selected.

- **Safe cancellable project opening** (slice 53): saved projects and `.dream`
  imports now show reading/restoration/patient-waiting stages and an accessible
  indeterminate loader. Cancel returns immediately, preserves current work and
  refuses a late result from replacing it.

- **Cancellable Real Code** (slice 52): code export now names preparation,
  provider writing, offline verification and patient-waiting stages with an
  indeterminate loader. Cancel returns the dialog to ready, forwards request
  cancellation and prevents a late provider reply from downloading a file.

- **Cancellable provider checks** (slice 51): Test connection now announces
  honest contacting, checking and patient-waiting stages without a fake
  percentage. Cancel stops immediately, forwards cancellation to the request,
  confirms settings stayed unchanged, and refuses a late hello from replacing
  that result.

- **Natural selected-object voice actions** (slice 50): “delete it” and
  “duplicate it” now resolve only to visible selected artwork, remain undoable,
  and name their result. Missing and locked selections get specific guidance,
  “delete everything” keeps its separate confirmation, and natural equivalents
  work across all six languages.

- **Sparse touch feedback** (slice 49): supported devices now give one short
  tactile cue for the first visible valid canvas drop target and a distinct
  double cue for a visible refusal. The setting defaults on, is optional,
  stays silent under reduced motion or on unsupported hardware, and never
  vibrates continuously while drawing.

- **Natural voice corrections** (slice 48): yes/no now acts as an answer only
  when the whole meaningful utterance is an answer. “No, undo that” reaches
  Undo and “yes, make it red” reaches the color action instead of being
  swallowed as confirmation, while standalone answers keep destructive-clear
  safety exact across localized vocabularies.

- **Voice selection reference** (slice 47): “make it bigger/smaller” now
  understands visible selected artwork as “it,” scales it about its shared
  center in one undoable step, and names the result. With no selection it keeps
  the familiar brush-size behavior; locked selections are refused truthfully.
  Contextual feedback is localized in all six languages and covered at the
  selection and voice-executor boundaries.

- **Truthful AI progress and cancellation** (slice 46): Create, Edit and
  Feedback now show staged, action-specific indeterminate progress instead of
  only changing a button label. Cancel returns immediately, forwards an abort
  signal to connected services, confirms that nothing changed, and refuses any
  late provider result. The accessible, reduced-motion-aware experience and
  cancellation boundary are covered by focused tests and all six locales.

- **Predictive direct manipulation** (slice 45): Select previews the exact
  topmost object before click; canvas cursors now distinguish objects, resize,
  active drags, pan, zoom direction, fill, stamp, locks and playback. Component
  and image drags receive named valid/invalid canvas feedback before release,
  with browser coverage for pointer and drop-state transitions. Remaining
  panel and timeline controls now use the same unclipped styled tooltips instead
  of native browser bubbles.

- **Interaction truth and discoverability** (slice 44): tooltips now escape
  scrolling toolbar and rail boundaries; AI Edit explains whole-layer behavior
  and can enter Design + Select in one action; the global voice mic remains
  visible when recognition is unavailable and explains the working alternatives.
  Browser tests cover both tooltip containers, the selection handoff, voice
  fallback and an actual spoken-story request.

- **Agent freehand authoring** (slice 43): dream-mcp agents can now append
  ordinary brush, pencil or eraser strokes with bounded geometry, style,
  optional pressure samples and id/name layer targeting. The same pressure
  floor, opaque pencil/eraser behavior and active-frame mirroring as the app
  are covered by real-file and rendered-protocol tests.

- **Truthful AI provider state** (slice 42): choosing a new own-AI provider
  now stays visibly selected while setup is incomplete, blocks creation until
  Save, and explains the required next step. Switching back to a previously
  configured provider takes effect immediately. The free provider is named
  and described as an offline scene maker so it cannot be mistaken for an
  open-ended image model.

- **Agent-safe layer management** (slice 41): dream-mcp agents can now rename,
  show/hide, set opacity, lock/unlock, reorder and remove layers in the active
  frame. Id/name targeting, animated stack mirroring, invalid-value errors and
  final-layer protection are covered by real-file tests and the live demo.

- **One-click brand delivery** (slice 40): Export can now produce one safely
  named ZIP containing source-size, 1024 px and 512 px long-edge PNGs plus a
  real SVG whenever the active canvas is genuinely scalable. The pack preserves
  aspect, visible appearance and the working document, and is localized in all
  six languages.

- **Focused professional brush presets** (slice 39): Brush now offers Fine
  ink, Soft marker, Bold paint and Calligraphy as compact one-click starting
  points. Each sets the visible size, opacity and tip together, remains fully
  editable, never changes existing marks and is localized in all six languages.

- **Complete Russian journey** (slice 38): Русский covers every product
  surface with exact key/placeholder parity, persistent LTR switching and
  `ru-RU` speech. Russian commands cover creation, recovery, games, app/code
  delivery and narration while English remains available; common color case
  forms work naturally, Russian sequence language plans stories locally, and
  offline game descriptions understand templates, settings, lives and named
  layers. Long translated labels also prompted a toolbar correction that keeps
  Story, AI, voice, recovery and Settings anchored. A browser proof reaches
  Aleksandr's keyboard-first Design workflow.

- **Complete Brazilian Portuguese journey** (slice 37): Português (Brasil)
  covers every product surface with exact key/placeholder parity, persistent
  LTR switching and `pt-BR` speech. Brazilian commands cover creation,
  recovery, games, app/code delivery and narration while English stays
  available; Portuguese sequence language plans stories locally, and offline
  game descriptions understand templates, settings, lives and named-layer
  roles. Manual review corrected literal art terms and an unsafe translation
  of game casting before browser validation reached Maria's project and code
  export path.

- **Complete Simplified Chinese journey** (slice 36): 简体中文 now covers the
  entire product with exact key and placeholder parity, persistent instant LTR
  switching and Mainland Mandarin speech selection. Natural unspaced Chinese
  commands cover tools, colors, recovery, animation, games, apps, code export
  and narration while English remains available; Chinese punctuation and
  sequence words create local story moments, and Chinese game descriptions
  choose templates, settings and named-layer roles offline. A production
  browser proof reaches the native scientific-plot workflow in Chinese rather
  than stopping at the Settings menu.

- **Native scientific data plots** (slice 35): Design mode can turn a small
  labeled CSV or TSV table into a line, scatter or grouped-bar figure. Parsing
  is bounded and explicit, with quoted labels, row/series confirmation and
  non-destructive errors. Rounded axes, readable ticks, a quiet grid, title and
  color-keyed legend are generated as ordinary grouped marks on one new layer,
  so the figure moves, scales, saves, animates, exports as real SVG and undoes
  exactly like the rest of Dream. The focused dialog is loaded only when used
  and starts with a valid example rather than an empty technical form.

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
