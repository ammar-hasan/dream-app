# Dream

[![CI](https://github.com/ammarhasanrizvi/dream-app/actions/workflows/ci.yml/badge.svg)](https://github.com/ammarhasanrizvi/dream-app/actions/workflows/ci.yml)

Dream is an intuitive, simple, elegant design app — as simple as MS Paint, as deep as
Photoshop, AI-assisted, and usable by anyone from a 5-year-old to a 90-year-old. It is
free, runs entirely in the browser, and will grow to support image editing, design mode
(layers/components), animation, presentations, videos, and even games. See `IDEA.md`
for the full product vision.

## Try it

**https://ammarhasanrizvi.github.io/dream-app/** _(placeholder — live once GitHub Pages
is enabled: repo Settings → Pages → Source: "GitHub Actions", then the Deploy workflow
publishes `dist/` on every push to `main`)_

This repository currently contains **Slice 1** (foundation + core drawing),
**Slice 2** (image editing: import, filters, crop & transform), **Slice 3**
(design mode: selection, components, alignment), **Slice 4** (animation,
video export and presentation mode), **Slice 5** (the AI panel with
BYOK providers and voice input), **Slice 6** (accessibility for everyone:
kid mode, canvas voice commands and i18n with RTL), the **polish pass**
(design system, dark theme, brand, micro-delight), the **drawing power
tools** (mirror symmetry, pen pressure, filled shapes, lasso, magic wand
and the spray brush), **game mode** (describe a game, cast your drawings and
play Catch!, Flappy Dream, Maze Runner or Dream Jumper) and **app mode** (link your frames into an interactive
prototype and export it as one standalone HTML file), and the **developer
surface** (a portable `.dream` file format, an MCP server for agents, and a
stable engine API), and **voice narration** (record your voice over an
animation or presentation and export a real little movie with the voice
baked in). It is also an **offline PWA** (installable, works with
the network off) with an **incremental rendering pipeline** (per-layer
bitmap caching) that keeps big documents smooth.

<!-- Screenshots: drop light/dark theme captures into docs/screenshots/ and
     link them here once we have a stable marketing look. -->

## Look & feel (theming)

Dream has a small design system defined as CSS custom properties at the top
of `src/styles/app.css`: a signature indigo→violet→rose gradient, calm
neutral surfaces, a dark canvas-surround so artwork pops, soft radii and an
elevation scale. Components consume tokens only — no hardcoded colors
outside the token blocks.

- **Dark mode** — the settings gear toggles light/dark. The choice persists
  per user (localStorage); until you choose, Dream follows your OS
  (`prefers-color-scheme`). Dark theme is the same tokens remapped under
  `[data-theme='dark']`.
- **Micro-delight** — sliding workspace-mode pill, styled tooltips
  (name + shortcut, pure CSS via `data-tooltip`, anchored beyond scrolling
  toolbar/rail edges), dialog fade/scale-in,
  a gentle ambient drift behind the canvas, a pulsing splash while the
  last document restores, and a welcome card on the empty canvas. All
  motion is transform/opacity-only and disabled under
  `prefers-reduced-motion`.
- **Brand** — the Dream mark (moon + spark on the gradient squircle) lives
  in `src/ui/icons.tsx` as `DreamMark`; the favicon is
  `public/favicon.svg`, and `public/manifest.webmanifest` plus the service
  worker below make the app installable and offline-capable.

## Offline PWA

Dream is a fully offline-capable PWA — install it, and it keeps working with
the network off (documents live in IndexedDB, which is local by design).

- **Service worker** — a small hand-rolled worker (`public/sw.js`, no
  build-time dependencies). A tiny in-house Vite plugin
  (`dreamServiceWorker` in `vite.config.ts`) injects the precache manifest
  and a content-hashed cache name into `dist/sw.js` on every build, so a
  new deploy always ships a new cache and old caches are deleted on
  activate. Registration runs in production only
  (`import.meta.env.PROD`, via `ui/pwa.ts`).
- **Caching rules** — precache: `index.html`, the hashed JS/CSS, the icons
  and the manifest. Navigations are network-first with a fallback to the
  cached `index.html`; same-origin GET assets are cache-first. Non-GET
  requests and ALL cross-origin requests bypass the worker entirely —
  AI-provider API calls are never cached.
- **Updates** — when a new version has downloaded, a quiet toast offers
  "A new Dream is ready — Refresh". The worker never activates on its own
  (`skipWaiting` only when you press Refresh); dismissing the toast simply
  keeps the current version until the next natural reload.
- **Install** — the settings menu shows "Install Dream" when the browser
  offers it (`beforeinstallprompt`); dismissing it is remembered in
  localStorage.

## Performance

The viewport renders incrementally (`engine/layerCache.ts`, DOM-free like
the rest of the engine): every layer is cached as an offscreen bitmap and
only re-rendered when its operations actually change (immutable updates
give a new `operations` reference, so invalidation is reference equality).
Each frame then costs one `drawImage` per layer instead of re-issuing every
operation — stroke previews, pan and zoom composite cached layers plus the
in-progress stroke only. Eraser strokes punch through lower layers with
`destination-out`, so documents containing one fall back to a single
whole-document snapshot (same "unchanged document → one drawImage" win,
without per-layer incrementality). Memory is bounded: documents larger
than 2048×2048 pixels skip caching, the cache is LRU-capped at 16 layers,
bitmaps are released when layers are deleted, and the whole cache is
dropped when a document closes. Timeline thumbnails are memoized per
frame — editing one frame never re-renders the others.

## Accessibility for everyone

The heart of Dream: a 5-year-old and a 90-year-old should both be able to
create — literacy optional. Slice 6 ships three pillars plus a settings menu.

The browser suite audits Draw, Design, Play, slide settings and Presenter for
serious/critical accessibility violations. Light/dark secondary text and
accent labels use WCAG-AA-readable tokens; reduced motion, keyboard focus and
RTL remain first-class product behavior.

- **Little Dreamer (kid) mode** — tap the ⭐ in the toolbar (or the settings
  gear). The tool rail becomes giant icon-only buttons for the essentials
  (brush, pencil, eraser, fill, stamps, shapes, eyedropper), a 12-color
  bright named palette and three brush sizes shown as dots. The right panel
  simplifies to big Undo/Redo, an "Ask Dream!" button (the AI Create tab with
  a giant mic) and a play button when frames exist. Turning kid mode on
  switches to Draw mode and turns both voices on; turning it off restores the
  full adult UI untouched. It is a per-user preference (localStorage), not
  per document.
- **Stamps & starter scenes** — the stamp tool (N) places one of twelve
  built-in doodles (star, heart, smiley, flower, sun, moon, cloud, tree,
  fish, butterfly, cat, rocket) at Small/Medium/Big: chunky, multi-color
  vector art drawn procedurally by the engine (`engine/stamps.ts`, no
  assets). A stamp is click-to-place — regular ops on the active layer, one
  undo per stamp, and its ops share a groupId so Design mode moves the whole
  doodle as one. In kid mode the rail's big stamp button opens a friendly
  picker grid with spoken names. The picker also offers "Start with a
  picture": three coloring-book starter scenes (Sunny garden, Night sky,
  Under the sea) — black outline art generated procedurally
  (`engine/starterScenes.ts`) and inserted as a new layer, ready to color in
  with the brush or fill bucket.
- **Comfort mode** — the settings gear's senior-friendly toggle: bigger text
  and targets and a higher-contrast variant of the current theme, applied as
  a `data-comfort` attribute on the root that restyles the design tokens
  (light and dark both strengthen text/border contrast). Per-user
  (localStorage), and it composes with kid mode and RTL.
- **Spoken tool names** — hovering, focusing or touching a tool button says
  its name aloud ("Brush!") via speech synthesis (`ai/say.ts`, feature
  detected, silent where unsupported). On by default in kid mode, toggleable
  in settings for everyone.
- **Canvas voice commands** — the mic button in the toolbar. Click, speak,
  and watch Dream write what it hears before acting. A compact conversation
  card keeps the transcript beside the result, supports Stop/Speak again, and
  accepts the same localized commands by typing when browser recognition or
  microphone permission is unavailable. Escape closes it and restores focus.
  Commands include "undo", "redo", "clear" (asks for a spoken yes first), "new frame",
  "play"/"stop", "play my game", "preview my app", "export my app", "brush",
  "spray", "wand", "stamp", "eraser", "fill",
  colors ("red",
  "blue", … a friendly vocabulary including "fill red"), "mirror on"/
  "mirror off", "bigger"/"smaller", "export real code", "record narration"/
  "stop recording"/"delete narration", selected-object “delete it”/“duplicate
  it”, “move it left/right/up/down”/“center it” and “put it at the top edge”,
  the immediate continuation “again”, "save" and "help"
  (speaks the command list). The pipeline is a pure parser
  (`ai/voiceCommands.ts`, case-insensitive, filler-tolerant — "um, can you
  please undo?") plus a thin executor (`ui/voiceExecutor.ts`) against a
  minimal store interface. Every command confirms in the status area and,
  when **voice feedback** is on, out loud. Without SpeechRecognition the mic
  remains visible and explains the touch, mouse and keyboard alternatives.
  Visible selection supplies context: “make it bigger/smaller” scales selected
  artwork, “make it red” recolors vector artwork, “delete it” removes only the
  selection, “duplicate it” makes an offset selected copy, spoken directions
  nudge by 10 px, and “center it” uses the canvas center; every action is
  undoable. “Put it at the top/right/left/bottom edge” aligns the shared bounds
  to that canvas edge. An incomplete “move it” asks which way without changing
  anything, exposes four labelled choices, and accepts the next one-word answer
  by voice or typing in all six locales. Immediately after a successful directional nudge,
  “again” repeats only that nudge; every interruption clears this ephemeral
  context, and destructive or non-nudge actions are never repeatable. Bare
  colors still choose the drawing color. Missing, locked and raster selections
  receive truthful, task-specific guidance.
  Answer words also preserve corrections: “no, undo that” reaches Undo, while a
  standalone “no” still safely answers a pending destructive confirmation.
  The vocabulary is **per-locale**: with
  the UI in Arabic the parser also understands Arabic commands (تراجع،
  إعادة، امسح، إطار جديد، شغّل، أوقف، فرشاة، ممحاة، طابع، العب لعبتي،
  سجّل صوتي، أوقف التسجيل، امسح الصوت،
  أحمر/أزرق/أخضر/أصفر/أسود/أبيض، أكبر/أصغر…) — the Arabic words merge into
  the English table (which always keeps working), transcripts are
  normalized for diacritics and alef forms, and recognition switches to
  Arabic too. فارسی provides the same intent surface (واگرد، قلم‌مو، پاک‌کن،
  فریم جدید، پیش‌نمایش برنامه، ضبط روایت، آبی، آینه روشن، ذخیره…) with
  Iranian Persian recognition and Arabic-keyboard yeh/kaf normalization;
  简体中文 adds natural unspaced Mandarin commands (撤销、填充红色、关闭镜像、
  玩迷宫、预览应用、停止录音…) and Mainland Mandarin recognition. Português
  (Brasil) adds Brazilian commands, story/game language and `pt-BR` speech.
  Русский adds Russian commands with common case forms, story/game language
  and `ru-RU` speech.
  English commands keep working in every additional language.
- **Languages & RTL** — every UI string lives in a string table
  and renders through `t(key)`. The settings gear switches among English,
  العربية, فارسی, 简体中文, Português (Brasil) and Русский at runtime (persisted);
  Arabic and Persian flip the whole shell to `dir="rtl"` while Chinese,
  Portuguese and Russian remain LTR. The layout uses
  logical positioning, so mirrored panels, rails and Settings remain visible.

The **settings gear** in the toolbar consolidates all of it: Little Dreamer
mode, speak tool names, voice feedback, the dark-mode toggle, comfort mode,
optional touch feedback on supported hardware,
and the language picker.

### Adding a locale

1. Copy `src/ui/i18n/en.ts` to `src/ui/i18n/<locale>.ts` and translate every
   value (keys must match exactly — the i18n tests assert parity).
2. Register it in `src/ui/i18n/index.ts`: add the dictionary to
   `DICTIONARIES` and an entry `{ id, label, dir }` to `LOCALES`
   (`dir: 'rtl'` flips the root `dir` attribute automatically).
3. Done — the settings picker lists it. `t()` falls back to English for any
   missing key, so partial dictionaries still work.

## What works today

- Brush, pencil, eraser with adjustable size, color (palette + custom + a
  recent-colors row) and opacity — with per-point pen pressure on a stylus;
  Brush also offers a fixed-angle Calligraphy nib for directional thick/thin
  marks using mouse, touch or pen, plus Fine ink, Soft marker, Bold paint and
  Calligraphy presets that set the visible size, opacity, tip and steadiness
  together. Brush, pencil and eraser share an optional 0–100% Steady stroke
  control that visibly smooths future paths without moving their endpoints.
- Spray (airbrush) with a density slider; deterministic per-stroke seeds
- Line, rectangle and ellipse tools with Shift-to-constrain (45° lines,
  squares, circles), plain/arrow/two-way line ends, and an optional fill-shapes
  mode (filled with the current color)
- Mirror symmetry (vertical / horizontal / quad) with live mirrored preview
- Flood fill (bucket), magic wand (move / delete / copy-to-layer a region),
  eyedropper color picker, and a click-to-type text tool with a Persian-script
  Nastaliq/Naskh-aware font choice plus caret-aware scientific symbols
- Stamp tool: twelve built-in cute stamps at S/M/L plus three coloring-book
  starter scenes, all procedurally generated (no assets), one undo per stamp
- Comfort mode: a senior-friendly settings toggle — larger text/targets and
  higher-contrast tokens, composing with dark theme, kid mode and RTL
- Layers: add, delete, rename, reorder, visibility, opacity, Design-only blend
  mode, editable adjustments, lock — all undoable
- Image import: file picker, drag-and-drop onto the canvas, or paste from the
  clipboard — each image lands centered on its own layer (scaled down to fit);
  valid image/component drags and invalid content get distinct named targets
- Move tool drags any layer's content with open/closed-hand feedback; flip horizontal/vertical and rotate 90°
  CW/CCW per layer (around the layer's own content, so it stays in place)
- Adjust panel: brightness, contrast, saturation, hue, grayscale, sepia, invert,
  blur (box) and sharpen (3x3 kernel) with live preview and B&W / Vintage / Cool /
  Warm presets — Apply saves one undoable editable effect without flattening
  original marks; Cancel restores the last saved settings
- Crop tool (drag a rectangle, Apply or Enter) and a Resize dialog that scales
  the document and its content to fit (nearest-neighbor for raster pixels)
- Undo/redo across every operation (200-step command history)
- Zoom (25%–800%) and pan (Space-drag, pan tool, wheel zoom anchored at the
  cursor) — plus a floating zoom pill (bottom-end of the canvas) with −/%/+
  and one-tap fit-to-window
- New document dialog (presets + custom size + background color)
- Autosave to IndexedDB (imported images included), open/delete saved projects,
  export flattened PNG or JPEG (with quality setting), export genuinely
  scalable visible strokes/shapes/connectors/text as SVG, export one brand-pack
  ZIP with source-size/1024/512 PNGs plus SVG when truthful, and portable
  `.dream` project files (Export dialog downloads one; the Open dialog opens
  them, with drag-and-drop). SVG is disabled with a plain PNG fallback when
  visible pixel or eraser content cannot remain vector.
- Elegant splash while the last document restores; a welcome card (logo +
  "Pick a brush and start dreaming") that dismisses when creation begins
- Light & dark themes with a full design-token system; styled tooltips with
  shortcuts; subtle reduced-motion-aware animation throughout
- Fully mouse- and touch-driven (Pointer Events), devicePixelRatio-crisp rendering

## Animation (the flipbook)

The **Animate** button in the toolbar turns any drawing into a frame-by-frame
animation and opens the timeline bar at the bottom — big thumbnails, one big
play button, everything called "frames".

- **Frames**: each frame owns its own layer stack (the Layers panel always
  edits the current frame). `+` adds a blank frame, ⧉ duplicates the current
  one, ←/→ reorder, ✕ deletes — every frame operation is undoable through the
  same history as your strokes. Clicking a thumbnail switches frames (that's
  navigation, like scrolling — intentionally not undoable).
- **Onion skin**: the Onion toggle ghosts the previous frame beneath the
  current one while you draw (opacity slider, optional next-frame ghost).
- **Playback**: play/pause in the main viewport, 1–24 fps (default 6), loop
  on/off. Editing pauses while playing. Space toggles play **when the
  timeline has focus** (click any frame first); everywhere else Space stays
  hold-to-pan.
- **Phone task focus**: at phone width the frame strip and frame-editing
  actions stay visible, while an Animate / Slides / App choice shows only the
  controls needed for that job. App leads to linking first and preview once
  links exist. Desktop keeps the complete timeline; Little Dreamer keeps its
  simpler animation-only path.
- **Phone creation shell**: the top bar keeps Story, AI, voice, Undo, Settings
  and all four workspaces in stable positions with no sideways scrolling.
  New/Open/Save/Import/Resize/Export, Animate, Redo and Little Dreamer live in a
  labelled two-column More tray that closes after use or Escape and preserves
  44 px comfort targets.
- **Phone editing dock**: adult Draw and Design use a stable six-place bottom
  dock instead of spending canvas width on a desktop rail. The active tool stays
  visible, Select is direct in Design, All tools exposes the complete set, and
  Controls restores Options, Adjust, Layers, Design, Links and Components in a
  dismissible sheet. Tapping AI opens its real panel there instead of a hidden
  desktop sidebar.
- **Story to animation**: choose Story, tap Little Dreamer's large “Tell a
  story!”, or say “make a story about…” / «اصنع لي قصة عن…». Dream locally
  plans two to six numbered moments before touching the canvas. Edit, add,
  remove, replan or hear each moment aloud, then confirm once. The active
  image-capable provider (or the clearly named built-in fallback) paints the
  sequence with whole-story continuity. Determinate progress names the exact
  moment being painted and marks completed moments; Cancel or Escape stops
  immediately. Only a completely successful batch lands—even a late provider
  reply after cancellation is discarded. Captions retain the reviewed words,
  existing artwork is preserved, and one Undo removes all generated frames. A
  whole built-in story costs one daily try; image-capable BYOK stays unlimited.
- **Voice narration**: the timeline's mic button records one voice take over
  the playing animation — tap, talk ("once upon a time…"), tap to save.
  Re-recording replaces the take after a gentle confirm (kid mode skips the
  confirm and gets a big "Tell the story!" mic); a take can be muted or
  deleted. Recording shows a pulsing red dot, elapsed time and a live mic
  level; the mic is asked for on the first record only, and the take never
  leaves the device (it persists with the project as a data URL, outside
  undo, with a warning over ~10 MB). One track per document, starting at
  time 0 — per-frame tracks are deliberately out of scope. The narration
  plays in sync during editor playback and when a Present session opens
  (with a small indicator + mute there), and the WebM export **bakes it in
  as the video's audio track** (mixed on-device via WebAudio; silent exports
  are unchanged). Voice commands: "record narration" / "stop recording" /
  "delete narration" — and in Arabic «سجّل صوتي» / «أوقف التسجيل» /
  «امسح الصوت». The recorder lives in `ui/narration.ts` (getUserMedia +
  MediaRecorder behind injectable deps, unit-tested state machine).
- **Export**: the Export dialog gains **WebM video** (recorded client-side
  via `canvas.captureStream` + `MediaRecorder`, VP9 with VP8/bare-WebM
  fallback, progress shown while recording) and **Sprite sheet** (all frames
  in one PNG grid, zero dependencies). GIF was skipped — it needs an encoder
  dependency; the sprite sheet covers the animated-asset use case. Browsers
  that natively support MP4 recording also get a real **MP4 video** option
  with the same timing, progress and narration mix; it is hidden elsewhere.
  Either video can stay Original or use a 720p Vertical 9:16, Square 1:1 or
  Landscape 16:9 canvas. Dream contains and centers the complete drawing—no
  cropping or stretching—and records at 30 fps while preserving the authored
  flipbook holds. Pick an inclusive Start frame / End frame to trim only the
  delivered video; the source animation stays complete and narration begins at
  the matching frame-time offset. Add a short caption per frame in the same dialog, step
  previous/next or copy one to all, and the captions are burned into the video
  over a readable safe-area backing. Export saves the batch as one undoable
  edit; shaped filenames include `-vertical`, `-square` or `-landscape`.
  Determinate frame progress stays visible during the real-time recording;
  Cancel or Escape stops and releases it immediately without downloading a
  partial video, while keeping the creator's caption edits.
- **Present mode**: the mode pill is now Draw / Design / Play / Present. Present
  turns frames into slides: full-viewport rendering, arrow keys / Space /
  click to advance, ← to go back, Esc to exit, slide counter at the bottom.
  Each slide can enter with no transition, a fade or a slide, advance after
  1–60 seconds, and carry presenter-only speaker notes. **Auto** follows those
  durations (pausing on manual slides); **Presenter** opens a synchronized
  second window with current/next previews, private notes, elapsed/remaining
  timing and audience controls. Notes never enter the audience window; popup
  blocking is explained without falling back to an unsafe overlay.
  No editing while presenting. A document without frames is a one-slide deck.
  Present is session-only — a project saved mid-presentation reopens in Draw.

The document model behind it: `doc.frames` is an optional ordered list of
frames, each with its own layers; `doc.layers` always mirrors the active
frame's stack, so the renderer, tools and persistence never had to learn
about frames, and old saves load unchanged (animation simply stays off).
Playback speed and onion-skin preferences are saved with the project but,
like the workspace mode, live outside undo.

## The AI panel (Dream AI + BYOK)

The sparkle button in the toolbar (or the `A` key) opens the AI panel — a
friendly assistant you talk to, with three tabs. Story-to-animation is its
fifth capability and lives beside Animate. Everything it does lands
on the document through the same undoable history as your own strokes.

- **Create**: describe what you want ("a sleepy fox under a starry sky")
  and it appears as a new layer. The mic button 🎤 fills the prompt by
  voice (Web Speech API; hidden where unsupported).
- **Edit**: describe a change ("warmer", "dreamy", "more pop"), or connect
  an edits-capable BYOK model and ask for something new ("put a little boat
  here"). With "Selected part only" ticked, the current Design-mode selection
  box becomes the edit region; the rest of the layer is untouched. Capable
  BYOK providers also expose one-tap **Erase this** to remove the selection
  and fill the gap naturally. Both actions are one undo step.
- **Feedback**: "Look at my design" returns kind, concrete observations
  plus suggestions — each with an **Apply** button where Dream can do it
  for you (contrast/brightness/warmth fixes, centering the selection).

Connected Create, Edit and Feedback requests show honest indeterminate
progress with action-specific status instead of a made-up percentage. **Cancel**
returns the panel to ready immediately, asks the service to stop and discards
any late result so the artwork and undo history stay untouched. Provider
**Test connection** follows the same staged, cancellable contract and never
changes saved settings when stopped.

**Dream AI** is the built-in offline-scene provider: free, offline,
deterministic. Its Create hint names the scene themes it understands instead
of implying open-ended image generation. It
paints procedural scenes (seeded by your words — night, sunset, forest,
ocean, snow…), edits via the real engine filters, and gives feedback from
a rule engine that reads the actual document (palette histogram, canvas
coverage, contrast and warmth heuristics). It comes with **20 free tries
per day** (persisted, rolling over at midnight); the panel shows the
countdown subtly.

**BYOK — bring your own key.** In the panel's Settings you can point Dream
at any OpenAI-compatible endpoint: chat goes through `/chat/completions`,
image generation through `/images/generations` (tick "This AI can also
paint images" if the endpoint supports it and enter its **Image model**), and
generative fill/erase through multipart `/images/edits`. Enter an **Edits
model** only when that endpoint supports the edits route; `gpt-image-2` is the
current OpenAI example for both image fields. At the official OpenAI endpoint,
leaving Image model blank uses that current default; leaving Edits model blank
keeps BYOK editing disabled instead of making a false capability claim. With
your own provider active the daily counter disappears and usage is unlimited.
Choosing your own provider stays visibly pending and disables Create until the
first Save; choosing an already saved provider activates it immediately.
Settings (URL, chat model, image model, edits model, active provider) persist
in localStorage; **API keys live in sessionStorage only** (gone when the tab
closes) unless you tick "remember key", and are never logged. Examples:

```
OpenRouter:  base URL https://openrouter.ai/api/v1   model openai/gpt-4o-mini
OpenAI:      base URL https://api.openai.com/v1      model gpt-4o-mini
             image model gpt-image-2
             edits model gpt-image-2
Ollama:      base URL http://localhost:11434/v1      model llama3.1  (no key needed)
LM Studio:   base URL http://localhost:1234/v1       model <loaded model>
```

The **Test connection** button validates URL/key/chat-model with one cheap
round-trip and reports success or a friendly, jargon-free error. Endpoints
that can't generate or edit images simply declare so — the panel degrades
gracefully and offers to switch back to Dream AI.

## Drawing power tools

The pro drawing upgrades live alongside the classic tools — in the adult
tool rail and the options panel (Little Dreamer mode stays untouched).

- **Mirror / symmetry** — the Mirror select in the options panel (off /
  vertical / horizontal / quad) reflects every brush, pencil, eraser, spray,
  line and shape gesture live across the canvas center axes, with a soft
  dashed accent line showing the active axes. Mirrored strokes are real
  operations committed together with the original in ONE undoable command —
  a single undo removes the whole symmetric bloom (`engine/symmetry.ts`).
  Session-only, like the zoom level.
- **Pen pressure** — with a stylus, brush/pencil/eraser strokes modulate
  their width per pointer sample (`PointerEvent.pressure`, pen only). The
  multipliers ride on the stroke op (`widths`) and the renderer interpolates
  between points. Mouse and touch strokes carry no `widths` and render
  exactly as before.
- **Calligraphy nib** — the Brush's second tip fixes a broad edge at 45°:
  gestures along it run thin and gestures crossing it run broad. That rhythm
  works without a stylus; pen pressure multiplies it when available. The
  resulting per-point widths are ordinary deterministic stroke data, so one
  Undo removes the gesture and every preview/export agrees.
- **Steady stroke** — Brush, Pencil and Eraser share a visible session-only
  0–100% control. Zero leaves sampled input exact; higher values reduce small
  wobble while keeping the start and live pointer endpoint anchored. Preview
  and commit use the same path, pressure remains aligned, and Spray is
  intentionally unaffected.
- **Filled shapes** — the "Fill shapes" toggle fills rectangles and
  ellipses with the current color (no outline — the simpler, prettier
  option; the outline tools behave as always when it's off).
- **Lasso (Design mode, K)** — draw a freehand loop; ops whose selection
  bounds CENTER falls inside the polygon become the selection (center-based
  keeps big background ops from being swallowed by a small loop). Shift
  adds to the selection, like the marquee.
- **Magic wand (W)** — click a pixel to lift the contiguous region of
  similar color (tolerance slider) out of the active layer into a floating
  patch. Drag it to move it, Delete to remove it, or "Copy to new layer"
  to duplicate it; Esc puts it back. Moving and deleting bake the layer to
  a raster — the same destructive-bake model as filters — each as one
  undoable command (`engine/tools/wand.ts`, sharing the flood-fill scanline
  traversal).
- **Spray (S)** — an airbrush: seeded stochastic dots scattered along the
  stroke with a density slider. The seed travels on the stroke op, so every
  redraw (viewport, export, thumbnails) paints the identical mist
  (`engine/spray.ts`).
- Voice commands learned **"spray"**, **"wand"**, **"lasso"** and
  **"mirror on" / "mirror off"**.

## Design mode

The Draw / Design switch in the top toolbar moves between two workspaces. Draw
is the default MS-Paint-simple experience, exactly as before. Design mode is the
pro workspace — the mode is persisted per project.

After an adult's first successful drawing, a one-time “Want to move or change
that?” invitation offers **Select it**. It enters the ordinary Design/Select
workspace with only the marks from that gesture selected; one Undo still
removes the drawing because the handoff itself is not history. Selecting,
closing, continuing to draw or finding Design independently teaches the lesson
once per device. Little Dreamer remains invitation-free.

- **Select tool (V)**: click any object on the active layer to select it
  (strokes, shapes, text, images, fills — topmost wins). Shift-click toggles,
  drag on empty canvas rubber-band-selects. The **lasso (K)** selects with a
  freehand loop instead (bounds-center inside the polygon). The selection
  shows per-object boxes plus a shared bounding box with handles. Before click,
  a lighter box and contextual cursor reveal the exact object or handle the
  next press will grab.
- **Move / scale / rotate**: drag the selection to move it; corner handles
  scale uniformly; the handle above the box rotates. Rotation is free-form for
  strokes, lines and text anchors (Shift snaps to 15°); selections containing
  rectangles, ellipses or raster ops (images, fills) rotate in 90° steps. A
  pointer-side badge reports the effective angle and constraint, with optional
  tactile detents at snapped boundaries.
- **Snapping**: while dragging, the selection snaps to the canvas center and
  edges and to other objects' edges/centers, with thin accent guide lines and a
  compact pointer-side confirmation. Entering a new guide adds one optional
  tactile detent on supported devices; moving along it stays quiet. Toggle
  snapping in the Design panel (on by default).
- **Group / ungroup**: groups are a `groupId` on ops, not a scene graph —
  grouped objects select and transform as one unit.
- **Reorder, duplicate, delete, nudge**: bring forward / send backward within
  the layer, Cmd/Ctrl+D duplicate, Del delete, arrow keys nudge (Shift = 10px).
- **Align & distribute**: with a multi-selection the Design panel offers align
  left/center/right/top/middle/bottom and horizontal/vertical distribute.
- **Data plots**: paste a small labeled CSV or TSV table and insert a line,
  scatter or grouped-bar figure with rounded numeric axes, grid, ticks, title
  and color-keyed legend. The complete plot is one grouped native-mark layer,
  not an opaque chart: move/scale it, annotate it, animate it, save it, export
  it as SVG, or remove it with one Undo. Invalid data never touches the canvas.
- **Components**: save any selection as a named component in the cross-project
  library (IndexedDB). The Components panel shows live thumbnails; use the named
  Insert control by keyboard or pointer (or double-click) to place at the canvas
  center, or drag onto the canvas to drop under the cursor — a compact thumbnail
  follows the pointer while a translucent,
  exact-scale canvas preview names the component and shows its final position.
  Each instance lands selected on its own layer. **Instances are copies**:
  editing the component does not update already-placed instances (the simple
  MS-Paint model; linked masters are a possible future slice).
- Everything above is undoable through the same command history.

## App mode (interactive prototypes)

Draw your screens as frames, link them with hotspots, preview the app, and
export it as ONE self-contained HTML file you can send to anyone — it opens
in any browser, works offline, no Dream required. This is the v0.1 of
IDEA.md's "create whole applications with just your drawings".

- **The Link tool (U, Design mode)** — with animation on (each frame is one
  screen), drag a rectangle over a button you drew. The dialog asks "when
  tapped, go to frame…" plus an optional transition (none / fade / slide).
  Hotspots show as soft accent-tinted dashed rectangles with a tiny link
  glyph while the Link tool is active, and every add/edit/delete is undoable.
- **The Links panel** (Design mode) lists the current screen's hotspots:
  retarget via the frame dropdown, change the transition, delete. A hotspot
  whose target frame was deleted is flagged as broken — ignored in previews
  and exports until you retarget or remove it.
- **Preview app** — the button in the Links panel (or say "preview my app")
  opens Present mode in App flavor: only hotspots are tappable (hover shows
  the pointer and a subtle highlight), arrows and clicks elsewhere do
  nothing — it's an app, not a slideshow. Fade/slide transitions are
  transform/opacity-only, with a subtle Restart and Exit. The **Slideshow /
  App** toggle inside Present mode switches flavors any time.
- **Export → Interactive app (.html)** — every frame is flattened to a PNG
  data-URL, hotspots become transparent buttons over the screen image, and
  ~50 lines of dependency-free JS handle tap → transition → next screen,
  with responsive fit-to-window scaling, touch support, keyboard-accessible
  hotspots, a Home-key restart and a small "Made with Dream" corner. The
  generator is pure TypeScript (`engine/appExport.ts`).
- **Export → Share app link** — small prototypes become one self-contained,
  compressed URL that opens directly in the viewer. It carries only flattened
  PNG screens and working hotspots—not layers, hidden art, notes, narration,
  game state or AI settings. Oversize prototypes are directed to the
  Interactive app file, and malformed incoming links are rejected before any
  viewer markup is built.
- **Export → Real code (AI) (.html)** — the make-real path: instead of a
  pixel-faithful prototype, AI rewrites your app as REAL, readable code —
  screens as semantic `<section>`s, your texts as real text, links wired as
  real `<button>`s on a tiny hash router, your colors carried over. Dream
  sends a compact structured description of the app plus inline PNG pixels
  for visible imported or AI-made images to your chat-capable BYOK provider,
  and validates that the reply is one
  self-contained HTML file; with the built-in Dream AI a deterministic
  local template generates the app instead — free, offline, counted against
  the daily free tier, and honestly labeled "generated locally by Dream AI"
  (connect your own AI for richer code). The file downloads as
  `{name}-code.html`, commented and beginner-friendly, starting with "Made
  with Dream — where drawings come alive." The builder, extractor and
  template are pure TypeScript (`ai/makeReal.ts`). Real Code names its prepare,
  write and offline-check stages, stays cancellable, and never downloads a late
  provider reply after cancellation.
- **Discovery** — with two or more frames and no links yet, the timeline
  shows a gentle "Link your frames to make an app →" hint that activates the
  Link tool. Kid mode skips it (Play mode stays the kid path); voice learned
  "preview my app" and "export my app" — plus "export real code" (and «صدّر
  كود حقيقي» in Arabic) for the make-real export.

## Play mode (games)

The **Play** tab in the mode pill turns the drawing into a mini-game you play
right on the canvas. Four templates ship in the picker:

- **Catch!** — things fall from the top; the hero slides left/right to catch
  the good ones (+1 point) and dodge the bad ones (−1 life).
- **Flappy Dream** — the hero flies; tap, click, Space or ↑ flaps against
  gravity while gates scroll in from the right. Each gate threaded scores +1;
  one hit ends the run (kid mode gets 3 gentle shields).
- **Maze Runner** — a freshly generated maze every level (seeded, always
  solvable); guide the hero to the exit with arrows/WASD or swipe. Reaching
  the exit levels up to a bigger maze.
- **Dream Jumper** — run and jump across a short seeded side-scrolling course,
  collect stars and reach the flag. Falls spend a life and respawn; cast your
  own hero, collectibles, platforms and background.

All four share the same casting magic, controls, juice and sounds:

- **Make a game from words** — type a request like “My Rocket flies through
  Clouds, nice and slow.” Dream chooses a template, tunes easy/hard,
  fast/slow, many/few and lives/shields language, and casts layers whose names
  you mention. Type or use the feature-detected mic; English, Arabic,
  Simplified Chinese, Brazilian Portuguese and Russian work fully offline with no AI key
  or free try. The visible picker/settings show what it understood before Play.
- **Casting is the magic** — your own drawings become the game pieces. The
  cast panel assigns a layer to each role the template needs (Hero, plus
  Good/Bad Things, Obstacle or Background depending on the template). Every
  role offers a layer dropdown
  or "Draw it now" (creates a named layer, casts it and lands you in Draw
  mode with the brush ready). Roles left on Auto get a friendly stand-in
  drawn by the engine: a smiley hero, a gold star, a grumpy spiky rock
  (`game/defaults.ts` — no AI, no assets).
- **Controls**: arrow keys, touch/mouse drag (a finger is a joystick) and —
  in kid mode — two big on-screen arrows. A run starts with a "3… 2… 1…"
  countdown; catches pop "+1" floats, a bad catch shakes the stage and may add
  one optional short tactile impact on supported hardware, and the
  game-over card shows score, best and a big "Play again!".
- **Difficulty**: fall speed, spawn rate and lives are sliders in the cast
  panel (kid mode defaults to slower, sparser, 5 lives); the game also ramps
  up on its own the longer a run lasts. The best score persists per project
  (localStorage).
- **Sounds**: tiny procedural WebAudio bleeps (`game/sounds.ts`,
  feature-detected, no assets) — on by default in kid mode, off for adults,
  with a mute toggle in the corner.
- **Kid mode + voice**: the kid toolbar has a gamepad button that jumps
  straight into Play mode with a giant play button; saying "play my game"
  switches over and starts a run, "play flappy" / "play maze" / "play catch"
  pick a template first, and "stop" ends it.
- The **game core is pure TypeScript** (`game/core.ts`): one
  `tick(state, input, dtMs, rng) → state` function with an injectable seeded
  RNG, fully unit-tested (spawning, collisions, scoring, lives, game over,
  the difficulty ramp, determinism). Cast layers are rasterized once per run
  and cropped to their content; the backdrop is the document minus the game
  pieces. Casting choices and settings live on the document (`doc.game`,
  additive and backward compatible), updated outside undo like the workspace
  mode — undo never re-casts your game.

## For developers: .dream files, MCP and the engine API

Dream's document model is a portable, tool-friendly format, and the engine
that reads it is dependency-free TypeScript — so you can script Dream from
your own toolchain, or let an AI agent drive it.

### The `.dream` file format

A `.dream` file is UTF-8 JSON with a tiny envelope around the document:

```json
{
  "format": "dream-project",
  "version": 1,
  "document": { "id": "…", "width": 320, "height": 240, "layers": [ … ] }
}
```

- `document` is the engine's `DreamDocument` verbatim (see
  `src/engine/types.ts`): layers of operations (strokes, shapes, text, fills,
  images), optional animation frames with app-mode hotspots, optional
  Play-mode game setup.
- The one transformation: raster payloads (`patch.data` on fill/image ops)
  are base64 **PNG data URLs** (`data:image/png;base64,…`) instead of raw
  byte arrays — compact, and readable by anything with a PNG decoder.
- Readers must ignore fields they don't know; writers round-trip them
  (encode/decode spreads, so unknown fields survive). Version bumps will be
  additive where possible; breaking changes bump `version`.

In the app: **Export → Dream project (.dream)** downloads one, and the Open
dialog opens `.dream` files (button or drag-and-drop) next to the IndexedDB
library. Large opens name reading and restoration, remain cancellable and never
replace current work with a late result after cancellation. Encode/decode is
pure and codec-agnostic in `src/engine/projectFile.ts` — the browser plugs in a
canvas codec (`src/ui/dreamFile.ts`), Node plugs in `@napi-rs/canvas`.

### The MCP server (dream-mcp)

`mcp-server/` is a standalone Node package (not part of the webapp build)
exposing `.dream` files to agents over stdio MCP: `dream.read_project`,
`dream.create_project`, `dream.list_layers`, `dream.add_layer`,
`dream.update_layer`, `dream.remove_layer`, `dream.add_stroke`, `dream.add_text`,
`dream.add_shape`, `dream.render_png` (real PNGs via `@napi-rs/canvas`) and
`dream.export_app`.
Setup and client config (Claude Code, Codex) are in
[`mcp-server/README.md`](mcp-server/README.md); `npm run check:mcp` from the
repo root installs, builds and tests it. The repo also ships a root
`.mcp.json`, so MCP-capable agents working in this repo get dream-mcp
automatically once `npm run check:mcp` has produced `mcp-server/dist/`.
The standalone package and official `server.json` are registry-ready under
`@ammar-hasan/dream-mcp` / `io.github.ammar-hasan/dream-mcp`; public npm and
MCP Registry publication remain an explicit human-approved release action.

### The stable engine API

`src/engine/index.ts` is the public, semver-intended surface for programmatic
consumers — import from it, not from deep paths:

- **types** — `DreamDocument`, `Layer`, `Operation`, `Frame`, `Hotspot`, …
- **document helpers** — `createDocument`, `createLayer`, `appendOperation`,
  `withLayers`, frame-aware helpers
- **history** — the invertible `Command`/`History` model
- **renderer** — `renderDocument` against a structural 2D context (bring your
  own canvas: browser, `@napi-rs/canvas`, a mock)
- **filters, color, geometry** — pure pixel transforms and helpers
- **animation & hotspots** — the frame model and app-mode link queries
- **appExport** — the standalone interactive-HTML generator
- **projectFile** — `.dream` encode/decode with an injectable raster codec

Everything else under `src/engine/` (selection, symmetry, spray internals,
the tool state machines) is internal and may change without notice. The
engine has zero runtime dependencies and follows the app's semantic version;
breaking API changes land in CHANGELOG.md.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Script                  | What it does                                      |
| ----------------------- | ------------------------------------------------- |
| `npm run dev`           | Vite dev server                                   |
| `npm run build`         | Production build to `dist/`                       |
| `npm run preview`       | Serve the production build                        |
| `npm test`              | Run the test suite (Vitest)                       |
| `npm run test:watch`    | Watch-mode tests                                  |
| `npm run test:coverage` | Tests + engine coverage report                    |
| `npm run test:e2e`      | Playwright e2e suite (builds + previews first)    |
| `npm run typecheck`     | `tsc --noEmit` (strict mode)                      |
| `npm run lint`          | ESLint (typescript-eslint + react-hooks)          |
| `npm run format`        | Prettier write                                    |
| `npm run icons`         | Regenerate PWA PNG icons from the SVG mark        |
| `npm run release`       | Prepare a release (see "Releasing" below)         |
| `npm run check`         | typecheck + lint + test + build (what CI runs)    |
| `npm run check:full`    | `check` + e2e — run before a release/PR of note   |
| `npm run check:mcp`     | install, build and test the `mcp-server/` package |
| `npm run evals`         | smoke-test the agent-eval harness (`evals/`)      |

## Architecture map

```
src/
  engine/            Framework-free, pure TypeScript core (no DOM, no React)
    types.ts         Document, Layer, Operation (stroke/shape/fill/text/image),
                     WorkspaceMode, Frame, AnimationSettings, Component;
                     ops carry an optional groupId
    document.ts      Factories + immutable document/layer update helpers;
                     layer edits write through to the owning frame
    history.ts       Command-based undo/redo (invertible commands, no snapshots)
    animation.ts     Frame model (enable/disable/clone), playback timing,
                     onion-skin decisions, sprite-sheet layout — all pure
    hotspots.ts      App mode: hotspot queries (broken-target detection,
                     hit-testing) over the frame model — all pure
    appExport.ts     Standalone prototype export: frames as PNG data URLs +
                     hotspots → ONE self-contained interactive HTML file
    projectFile.ts   The .dream file format: JSON envelope + raster patches as
                     base64 PNG data URLs, via an injectable RasterCodec
    svgExport.ts     Truthful scalable export for visible vector-safe content
    dataPlot.ts      Bounded CSV/TSV parsing + native grouped plot generation
    layerCache.ts    Incremental compositor: per-layer bitmap cache (reference-
                     equality invalidation, LRU cap, eraser-aware snapshot
                     fallback, oversized-document bypass)
    stamps.ts        The 12 built-in stamps: cute multi-color doodles as engine
                     ops (deterministic, grouped per stamp)
    starterScenes.ts Coloring-book starter scenes (garden/night/sea): black
                     outline ops sized to the document — pure, deterministic
    index.ts         Public API barrel (the stable, semver-intended surface)
    renderer.ts      Renders a Document onto any 2D context (structural interface)
    symmetry.ts      Mirror mode: reflect stroke/shape ops across the center axes
    spray.ts         Seeded PRNG + deterministic spray-dot layout
    filters.ts       Pure pixel filters/adjustments over RGBA buffers (+ convolution)
    transform.ts     Flip/rotate/translate/crop/resize for buffers, layers, documents
    selection.ts     Design mode: hit-testing, marquee, lasso, move/scale/rotate math,
                     snapping, align/distribute, groups, component factories
    geometry.ts      clamp, normalizeRect, constrainEnd (Shift), boundingRect,
                     pointInPolygon…
    color.ts         hex <-> rgba, cssColor, built-in palette
    tools/           Pure tool state machines: stroke (pressure widths, spray
                     seed), shapes (fill toggle), fill (flood fill), wand
                     (region mask/extract/stamp), eyedropper, text, pan/zoom math
  store/             Zustand store wrapping the engine (all mutations via History)
                     + uiPrefs: per-user UI prefs (kid mode, voices, locale,
                     theme, recent colors)
  game/              Play mode ("Catch!"): the pure game core (entities,
                     spawn/collision/score, difficulty ramp, seeded tick),
                     sprite cropping helpers, procedural default cast drawings,
                     WebAudio bleeps — framework-free like the engine
  ui/                React shell: toolbar (top) with the Draw/Design/Play/Present
                     switch + Animate toggle, tool rail (left), canvas viewport
                     (ambient background, floating zoom pill, welcome card),
                     options + design + components + adjust + layers panels
                     (right), timeline bar + status bar (bottom), PresentView
                     (fullscreen slides), PlayView + PlayPanel (the game and
                     its casting couch), dialogs, image/video/sprite export,
                     settings menu, kid mode (KidPanel + kid rail), voice
                     command button + executor, i18n string tables (i18n/),
                     stamp picker (StampPicker — shared by the adult options
                     panel and the kid panel),
                     PWA glue (pwa.ts registration + UpdateToast update
                     prompt, install offer in the settings menu)
  storage/           IndexedDB via `idb`: projects + the cross-project
                     component library (one shared connection in db.ts)
  ai/                AIProvider contract (capabilities, PixelBuffer in/out)
                     + MockAIProvider (free built-in: procedural scenes,
                     keyword edits, rule-engine feedback in analyze.ts)
                     + OpenAICompatibleProvider (BYOK) + registry (settings
                     persistence; keys in sessionStorage unless remembered)
                     + daily free-tier counter + makeReal (the "real code"
                     export: app description builder, prompt, reply
                     extraction/validation, deterministic local template)
                     + Web Speech dictation
                     (speech.ts) + speech synthesis (say.ts) + the pure
                     voice-command parser (voiceCommands.ts)
  styles/            Plain CSS, token-driven light + dark themes
                     (`[data-theme='dark']`), 44px+ touch targets
public/              favicon.svg (the Dream mark) + icons/ (generated PNGs)
                     + manifest.webmanifest + sw.js (hand-rolled service
                     worker; the build injects the precache manifest —
                     see dreamServiceWorker in vite.config.ts)
e2e/                 Playwright suite: smoke.spec.ts, visual.spec.ts (baseline
                     screenshot), offline.spec.ts (SW offline boot against a
                     throwaway static server), helpers.ts — vitest never sees
                     this dir
mcp-server/          Standalone Node package (own package.json, NOT part of the
                     webapp build): the dream-mcp stdio MCP server — thin
                     protocol wiring (src/index.ts) over pure tool cores
                     (src/tools.ts) + the Node raster codec/frame renderer
                     (src/nodeCodec.ts, @napi-rs/canvas). Compiles the engine
                     in from src/engine; the webapp never imports it
scripts/             gen-icons.mjs (rasterize the SVG mark via chromium),
                     release.mjs (release prep; prints git commands, never
                     mutates git)
```

Data flow: pointer events → `ui/CanvasViewport` → tool state machines (`engine/tools`)
→ operations → `History.execute(command)` → new immutable `Document` in the Zustand
store → React re-renders → viewport redraws the document with `engine/renderer`.

## Keyboard shortcuts

`V` select (Design) / move (Draw) · `K` lasso (Design) · `U` link (Design) ·
`M` move · `B` brush ·
`P` pencil · `S` spray · `E` eraser ·
`L` line · `R` rectangle · `O` ellipse · `G` fill · `W` magic wand · `N` stamp · `I` eyedropper · `T` text ·
`C` crop · `H` pan · `Z` zoom ·
`Ctrl/Cmd+Z` undo · `Ctrl/Cmd+Shift+Z` / `Ctrl+Y` redo · `+`/`-` zoom ·
`Space` (hold) pan — inside the focused timeline it toggles play instead ·
`Shift` constrain shapes · `Enter` apply crop · `A` toggle the AI panel ·
`Esc` clear selection / cancel text/crop/wand

With a floating wand region: drag to move · `Del`/`Backspace` delete the region ·
`Esc` put it back

Design mode, with a selection: `Ctrl/Cmd+D` duplicate · `Ctrl/Cmd+G` group ·
`Ctrl/Cmd+Shift+G` ungroup · `Del`/`Backspace` delete · arrow keys nudge
(`Shift` = 10px)

Present mode: `→` / `Space` / click next slide · `←` previous · `Esc` exit —
in the App flavor arrows do nothing; only hotspots are tappable (`Home`-style
restart button bottom-end)

## Testing

- Engine unit tests: history edge cases, flood fill, geometry, color, filters,
  transforms (crop/resize/flip/rotate), every tool, selection (hit-testing per
  op kind, marquee, lasso polygon, scale/rotate math, snapping,
  align/distribute, groups, components), symmetry/mirror math for strokes,
  shapes and erasers, spray determinism (same seed → same dots, density
  bounds), pen-pressure width interpolation, filled-shape rendering and
  hit-testing, magic-wand region extraction on synthetic buffers
  (mask/extract/erase/stamp), animation (frame model, CRUD commands + undo,
  playback timing, onion-skin decisions, sprite-sheet layout), app mode
  (hotspot commands + undo, broken-target detection, standalone-HTML
  generation: structure, title escaping, percentage geometry, no external
  URLs), layer cache (composite ≤ layers+1 draw calls for an unchanged
  500-op document vs. re-issuing every op, per-layer invalidation, LRU +
  memory caps, eraser snapshot fallback), renderer
  (against a recording mock 2D context — no canvas package needed), connector
  arrowhead geometry, bounded table parsing/native plot construction and
  truthful SVG generation/fallback classification
- AI tests: provider registry + key/settings persistence, OpenAI-compatible
  request construction with a mocked fetch, capability degradation, the daily
  free-tier counter (date rollover via fake timers), the feedback rule engine
  on synthetic documents, mock-generator determinism (same seed → same
  pixels), selection-bbox edit regions, speech feature detection with a
  mocked SpeechRecognition, speech-synthesis feature detection (`say.ts`),
  and the voice-command parser (every intent, filler tolerance, the full
  color vocabulary, Arabic, Persian, Simplified Chinese, Brazilian Portuguese and Russian locale vocabularies
  — script normalization/unspaced Chinese matching, mirror-phrase precedence,
  English unaffected — unknown input → null)
- Accessibility tests: the voice executor against a fake store (each command
  maps to the right actions, clear confirmation flow, size clamping,
  localized messages), the UI-prefs store (kid-mode voice defaults,
  independent toggles, theme + comfort + recent-colors persistence,
  localStorage), the comfort-mode data-attribute effect on the root element,
  and the i18n string table (interpolation, English/key fallbacks, exact
  en/ar/fa/zh/pt/ru parity, RTL and regional speech-language mapping)
- Stamp & starter-scene tests: engine op counts, determinism (same inputs →
  same drawing), stamp bounds within the size box, scene bounds within the
  canvas, outline-only scenes; store integration (click-to-place as ONE
  undoable command, S/M/L sizing, locked layers, scene insertion as a new
  active layer)
- Store tests: drawing flow, layers, image import/move/adjust/crop/resize,
  design mode (mode switching, select gestures, transform handles, selection
  actions, component insert), animation (frame switching, cross-frame undo,
  playback state, present mode), AI panel paths (insert/edit/apply-suggestion),
  play mode (cast roles, clamped settings, run state, per-project high
  scores, Play reopening in Draw), undo/redo
- Game tests (`game/`): the Catch! tick core (spawning, hero movement and
  clamping, good/bad collisions, scoring, lives, game over, pop aging, the
  difficulty ramp, seeded determinism), sprite content-bbox cropping, default
  cast drawings against the recording mock, and sound feature detection with
  a fake AudioContext
- Export tests: SVG structure/escaping/pressure/connector fidelity and stable
  download names; WebM mime fallback, filenames, progress and error paths with
  mocked recorder/canvas (MediaRecorder can't run in Node — it's isolated
  behind injectable deps in `ui/exportAnimation.ts`), plus the narration
  mix-in path (tracks combined, no-narration path untouched)
- Narration tests (`ui/narration.ts`): the recorder state machine
  (idle/recording/error with fake MediaRecorder/getUserMedia), permission
  error mapping, data-URL serialization round-trip, the WebAudio export-mix
  composition with a fake AudioContext, and the record/save flows against a
  fake store
- Storage tests: real IndexedDB round-trips via `fake-indexeddb` (projects
  including image ops, animation frames, the narration take, and the
  component library)
- React smoke test: `App` renders (jsdom)
- PWA tests: service-worker registration gating (production-only, unsupported
  browsers, first-install vs. update) and the update flow (waiting worker →
  prompt → skipWaiting on user action) against fake containers
- Engine coverage is enforced at ≥80% (currently ~97% lines)

## E2E testing (Playwright)

`e2e/` holds the Playwright suite — kept out of Vitest (`exclude` in
`vite.config.ts`; Playwright's `testDir` is `e2e/`, so neither runner sees
the other's files). `npm run test:e2e` builds the app and serves the
production bundle via `vite preview`, then runs Chromium against it
(WebKit/Firefox are opt-in: `DREAM_E2E_ALL_BROWSERS=1 npx playwright test`,
after `npx playwright install`).

- `e2e/smoke.spec.ts` — boot/welcome, brush stroke verified by reading real
  canvas pixels, undo, Design-mode panels, Dream AI generation onto a new
  layer, table-to-grouped-plot creation, scientific connector/text creation
  plus downloaded SVG inspection, kid mode, Arabic RTL, Persian calligraphy
  RTL, complete Chinese science UI, Brazilian Portuguese export UI, Russian
  keyboard-first Design UI, dark theme. Every test is independent (fresh
  browser context → empty localStorage/IndexedDB).
- `e2e/visual.spec.ts` — one full-page screenshot baseline of the welcome
  state (`e2e/visual.spec.ts-snapshots/`), committed as the CSS-regression
  guard. Thresholds are deliberately generous to absorb cross-platform font
  anti-aliasing; regenerate after intentional UI changes with
  `npx playwright test --update-snapshots`.
- `e2e/offline.spec.ts` — the offline PWA check: boot, wait for the service
  worker to claim the page, then kill the test's own throwaway static
  server (dist/ over a random port) and assert the app still boots from the
  precache. A real dead server is used because Chromium fails SW-intercepted
  subresource requests under `context.setOffline`/`route.abort` emulation.

CI runs e2e in its own job (`playwright install --with-deps chromium`, 1
retry, report uploaded on failure), keeping the main `check` job fast.

## Releasing

Versioning is semver; notable changes live in `CHANGELOG.md` (Keep a
Changelog). The release script never touches git itself:

```bash
npm run release -- patch   # or minor / major
```

It verifies a clean tree, runs `npm run check`, bumps `package.json` (and the
lockfile copies) and seeds a CHANGELOG skeleton — then prints the exact
`git add / commit / tag / push` commands to run by hand. Pushing `main`
triggers the Deploy workflow, which publishes `dist/` to GitHub Pages at the
project-page path `/dream-app/` (Vite `base` is set via `vite build --base`).

## Contributing

- Read `AGENTS.md` first — it defines the project conventions.
- The engine must stay framework-free and unit-tested; UI may depend on the engine,
  never the other way around.
- Run `npm run check` before opening a PR; CI runs the same on Node 22.
- Keep diffs minimal and match the surrounding code style (`npm run format`).
- See `ROADMAP.md` for the upcoming slices.

## The agent harness

Dream is developed by AI agents as much as by humans, and the infrastructure
for that lives in the repo: `CLAUDE.md` (bootstrap for Claude Code),
`.claude/agents/` (specialized subagents: dream-engine, dream-ui,
dream-verify, dream-release), `.agents/skills/` (implement-slice,
verify-release, dogfood-mcp), `.mcp.json` (auto-wires the dream-mcp server
for MCP-capable agents — build it with `npm run check:mcp`), `evals/`
(deterministic agent-task graders; `npm run evals` smoke-tests them) and
`LOOPS.md` + `loops/` (bounded continuous-work loops). The map of how it
all fits together — including how agents dogfood Dream's own MCP server to
build Dream — is [`docs/HARNESS.md`](docs/HARNESS.md).
