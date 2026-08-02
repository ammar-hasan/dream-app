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
and the spray brush) and **game mode** (turn your drawings into a playable
Catch! mini-game).

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
  (name + shortcut, pure CSS via `data-tooltip`), dialog fade/scale-in,
  a gentle ambient drift behind the canvas, a pulsing splash while the
  last document restores, and a welcome card on the empty canvas. All
  motion is transform/opacity-only and disabled under
  `prefers-reduced-motion`.
- **Brand** — the Dream mark (moon + spark on the gradient squircle) lives
  in `src/ui/icons.tsx` as `DreamMark`; the favicon is
  `public/favicon.svg`, and `public/manifest.webmanifest` makes the app
  installable (no service worker yet — see ROADMAP slice 11).

## Accessibility for everyone

The heart of Dream: a 5-year-old and a 90-year-old should both be able to
create — literacy optional. Slice 6 ships three pillars plus a settings menu.

- **Little Dreamer (kid) mode** — tap the ⭐ in the toolbar (or the settings
  gear). The tool rail becomes giant icon-only buttons for the essentials
  (brush, pencil, eraser, fill, shapes, eyedropper), a 12-color bright named
  palette and three brush sizes shown as dots. The right panel simplifies to
  big Undo/Redo, an "Ask Dream!" button (the AI Create tab with a giant mic)
  and a play button when frames exist. Turning kid mode on switches to Draw
  mode and turns both voices on; turning it off restores the full adult UI
  untouched. It is a per-user preference (localStorage), not per document.
- **Spoken tool names** — hovering, focusing or touching a tool button says
  its name aloud ("Brush!") via speech synthesis (`ai/say.ts`, feature
  detected, silent where unsupported). On by default in kid mode, toggleable
  in settings for everyone.
- **Canvas voice commands** — the mic button in the toolbar. Click, speak,
  done: "undo", "redo", "clear" (asks for a spoken yes first), "new frame",
  "play"/"stop", "play my game", "brush", "spray", "wand", "eraser", "fill",
  colors ("red",
  "blue", … a friendly vocabulary including "fill red"), "mirror on"/
  "mirror off", "bigger"/"smaller", "save" and "help" (speaks the command
  list). The pipeline is a pure parser
  (`ai/voiceCommands.ts`, case-insensitive, filler-tolerant — "um, can you
  please undo?") plus a thin executor (`ui/voiceExecutor.ts`) against a
  minimal store interface. Every command confirms in the status area and,
  when **voice feedback** is on, out loud. The button hides where
  SpeechRecognition is unsupported. The vocabulary is English for now.
- **Languages & RTL** — every UI string lives in a string table
  (`ui/i18n/en.ts`, `ui/i18n/ar.ts`) and renders through `t(key)`. The
  settings gear switches language at runtime (persisted); Arabic flips the
  whole shell to `dir="rtl"` (the layout uses CSS logical properties, so
  panels and rails mirror).

The **settings gear** in the toolbar consolidates all of it: Little Dreamer
mode, speak tool names, voice feedback, the dark-mode toggle and the
language picker.

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
  recent-colors row) and opacity — with per-point pen pressure on a stylus
- Spray (airbrush) with a density slider; deterministic per-stroke seeds
- Line, rectangle and ellipse tools with Shift-to-constrain (45° lines, squares, circles)
  and an optional fill-shapes mode (filled with the current color)
- Mirror symmetry (vertical / horizontal / quad) with live mirrored preview
- Flood fill (bucket), magic wand (move / delete / copy-to-layer a region),
  eyedropper color picker, and a click-to-type text tool
- Layers: add, delete, rename, reorder, visibility, opacity, lock — all undoable
- Image import: file picker, drag-and-drop onto the canvas, or paste from the
  clipboard — each image lands centered on its own layer (scaled down to fit)
- Move tool drags any layer's content; flip horizontal/vertical and rotate 90°
  CW/CCW per layer (around the layer's own content, so it stays in place)
- Adjust panel: brightness, contrast, saturation, hue, grayscale, sepia, invert,
  blur (box) and sharpen (3x3 kernel) with live preview and B&W / Vintage / Cool /
  Warm presets — Apply bakes one undoable raster command, Cancel discards
- Crop tool (drag a rectangle, Apply or Enter) and a Resize dialog that scales
  the document and its content to fit (nearest-neighbor for raster pixels)
- Undo/redo across every operation (200-step command history)
- Zoom (25%–800%) and pan (Space-drag, pan tool, wheel zoom anchored at the
  cursor) — plus a floating zoom pill (bottom-end of the canvas) with −/%/+
  and one-tap fit-to-window
- New document dialog (presets + custom size + background color)
- Autosave to IndexedDB (imported images included), open/delete saved projects,
  export flattened PNG or JPEG (with quality setting)
- Elegant splash while the last document restores; a welcome card (logo +
  "Pick a brush and start dreaming") that dismisses on your first stroke
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
- **Export**: the Export dialog gains **WebM video** (recorded client-side
  via `canvas.captureStream` + `MediaRecorder`, VP9 with VP8/bare-WebM
  fallback, progress shown while recording) and **Sprite sheet** (all frames
  in one PNG grid, zero dependencies). GIF was skipped — it needs an encoder
  dependency; the sprite sheet covers the animated-asset use case.
- **Present mode**: the mode pill is now Draw / Design / Play / Present. Present
  turns frames into slides: full-viewport rendering, arrow keys / Space /
  click to advance, ← to go back, Esc to exit, slide counter at the bottom.
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
friendly assistant you talk to, with three tabs. Everything it does lands
on the document through the same undoable history as your own strokes.

- **Create**: describe what you want ("a sleepy fox under a starry sky")
  and it appears as a new layer. The mic button 🎤 fills the prompt by
  voice (Web Speech API; hidden where unsupported).
- **Edit**: describe a change ("warmer", "dreamy", "more pop"). With
  "Selected part only" ticked, the current Design-mode selection box
  becomes the edit region; the rest of the layer is untouched.
- **Feedback**: "Look at my design" returns kind, concrete observations
  plus suggestions — each with an **Apply** button where Dream can do it
  for you (contrast/brightness/warmth fixes, centering the selection).

**Dream AI** is the built-in provider: free, offline, deterministic. It
paints procedural scenes (seeded by your words — night, sunset, forest,
ocean, snow…), edits via the real engine filters, and gives feedback from
a rule engine that reads the actual document (palette histogram, canvas
coverage, contrast and warmth heuristics). It comes with **20 free tries
per day** (persisted, rolling over at midnight); the panel shows the
countdown subtly.

**BYOK — bring your own key.** In the panel's Settings you can point Dream
at any OpenAI-compatible endpoint: chat goes through `/chat/completions`,
image generation through `/images/generations` (tick "This AI can also
paint images" if the endpoint supports it). With your own provider active
the daily counter disappears and usage is unlimited. Settings (URL, model,
active provider) persist in localStorage; **API keys live in sessionStorage
only** (gone when the tab closes) unless you tick "remember key", and are
never logged. Examples:

```
OpenRouter:  base URL https://openrouter.ai/api/v1   model openai/gpt-4o-mini
Ollama:      base URL http://localhost:11434/v1      model llama3.1  (no key needed)
LM Studio:   base URL http://localhost:1234/v1       model <loaded model>
```

The **Test connection** button validates URL/key/model with one cheap
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

- **Select tool (V)**: click any object on the active layer to select it
  (strokes, shapes, text, images, fills — topmost wins). Shift-click toggles,
  drag on empty canvas rubber-band-selects. The **lasso (K)** selects with a
  freehand loop instead (bounds-center inside the polygon). The selection
  shows per-object boxes plus a shared bounding box with handles.
- **Move / scale / rotate**: drag the selection to move it; corner handles
  scale uniformly; the handle above the box rotates. Rotation is free-form for
  strokes, lines and text anchors; selections containing rectangles, ellipses
  or raster ops (images, fills) rotate in 90° steps, because those ops have no
  arbitrary-angle representation (documented in `engine/selection.ts`).
- **Snapping**: while dragging, the selection snaps to the canvas center and
  edges and to other objects' edges/centers, with thin accent guide lines.
  Toggle it in the Design panel (on by default).
- **Group / ungroup**: groups are a `groupId` on ops, not a scene graph —
  grouped objects select and transform as one unit.
- **Reorder, duplicate, delete, nudge**: bring forward / send backward within
  the layer, Cmd/Ctrl+D duplicate, Del delete, arrow keys nudge (Shift = 10px).
- **Align & distribute**: with a multi-selection the Design panel offers align
  left/center/right/top/middle/bottom and horizontal/vertical distribute.
- **Components**: save any selection as a named component in the cross-project
  library (IndexedDB). The Components panel shows live thumbnails; double-click
  inserts at the canvas center, or drag onto the canvas to drop under the
  cursor — each instance lands on its own layer. **Instances are copies**:
  editing the component does not update already-placed instances (the simple
  MS-Paint model; linked masters are a possible future slice).
- Everything above is undoable through the same command history.

## Play mode (Catch!)

The **Play** tab in the mode pill turns the drawing into a mini-game you play
right on the canvas. The first template is **Catch!**: things fall from the
top, and the hero slides left/right to catch the good ones (+1 point) and
dodge the bad ones (−1 life).

- **Casting is the magic** — your own drawings become the game pieces. The
  cast panel assigns a layer to each role: the Hero (the catcher), the Good
  Thing, the Bad Thing and the Background. Every role offers a layer dropdown
  or "Draw it now" (creates a named layer, casts it and lands you in Draw
  mode with the brush ready). Roles left on Auto get a friendly stand-in
  drawn by the engine: a smiley hero, a gold star, a grumpy spiky rock
  (`game/defaults.ts` — no AI, no assets).
- **Controls**: arrow keys, touch/mouse drag (a finger is a joystick) and —
  in kid mode — two big on-screen arrows. A run starts with a "3… 2… 1…"
  countdown; catches pop "+1" floats, a bad catch shakes the stage, and the
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
  switches over and starts a run, and "stop" ends it.
- The **game core is pure TypeScript** (`game/core.ts`): one
  `tick(state, input, dtMs, rng) → state` function with an injectable seeded
  RNG, fully unit-tested (spawning, collisions, scoring, lives, game over,
  the difficulty ramp, determinism). Cast layers are rasterized once per run
  and cropped to their content; the backdrop is the document minus the game
  pieces. Casting choices and settings live on the document (`doc.game`,
  additive and backward compatible), updated outside undo like the workspace
  mode — undo never re-casts your game.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Script                  | What it does                                    |
| ----------------------- | ----------------------------------------------- |
| `npm run dev`           | Vite dev server                                 |
| `npm run build`         | Production build to `dist/`                     |
| `npm run preview`       | Serve the production build                      |
| `npm test`              | Run the test suite (Vitest)                     |
| `npm run test:watch`    | Watch-mode tests                                |
| `npm run test:coverage` | Tests + engine coverage report                  |
| `npm run test:e2e`      | Playwright e2e suite (builds + previews first)  |
| `npm run typecheck`     | `tsc --noEmit` (strict mode)                    |
| `npm run lint`          | ESLint (typescript-eslint + react-hooks)        |
| `npm run format`        | Prettier write                                  |
| `npm run icons`         | Regenerate PWA PNG icons from the SVG mark      |
| `npm run release`       | Prepare a release (see "Releasing" below)       |
| `npm run check`         | typecheck + lint + test + build (what CI runs)  |
| `npm run check:full`    | `check` + e2e — run before a release/PR of note |

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
                     command button + executor, i18n string tables (i18n/)
  storage/           IndexedDB via `idb`: projects + the cross-project
                     component library (one shared connection in db.ts)
  ai/                AIProvider contract (capabilities, PixelBuffer in/out)
                     + MockAIProvider (free built-in: procedural scenes,
                     keyword edits, rule-engine feedback in analyze.ts)
                     + OpenAICompatibleProvider (BYOK) + registry (settings
                     persistence; keys in sessionStorage unless remembered)
                     + daily free-tier counter + Web Speech dictation
                     (speech.ts) + speech synthesis (say.ts) + the pure
                     voice-command parser (voiceCommands.ts)
  styles/            Plain CSS, token-driven light + dark themes
                     (`[data-theme='dark']`), 44px+ touch targets
public/              favicon.svg (the Dream mark) + icons/ (generated PNGs)
                     + manifest.webmanifest
e2e/                 Playwright suite: smoke.spec.ts, visual.spec.ts (baseline
                     screenshot), helpers.ts — vitest never sees this dir
scripts/             gen-icons.mjs (rasterize the SVG mark via chromium),
                     release.mjs (release prep; prints git commands, never
                     mutates git)
```

Data flow: pointer events → `ui/CanvasViewport` → tool state machines (`engine/tools`)
→ operations → `History.execute(command)` → new immutable `Document` in the Zustand
store → React re-renders → viewport redraws the document with `engine/renderer`.

## Keyboard shortcuts

`V` select (Design) / move (Draw) · `K` lasso (Design) · `M` move · `B` brush ·
`P` pencil · `S` spray · `E` eraser ·
`L` line · `R` rectangle · `O` ellipse · `G` fill · `W` magic wand · `I` eyedropper · `T` text ·
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

Present mode: `→` / `Space` / click next slide · `←` previous · `Esc` exit

## Testing

- Engine unit tests: history edge cases, flood fill, geometry, color, filters,
  transforms (crop/resize/flip/rotate), every tool, selection (hit-testing per
  op kind, marquee, lasso polygon, scale/rotate math, snapping,
  align/distribute, groups, components), symmetry/mirror math for strokes,
  shapes and erasers, spray determinism (same seed → same dots, density
  bounds), pen-pressure width interpolation, filled-shape rendering and
  hit-testing, magic-wand region extraction on synthetic buffers
  (mask/extract/erase/stamp), animation (frame model, CRUD commands + undo,
  playback timing, onion-skin decisions, sprite-sheet layout), renderer
  (against a recording mock 2D context — no canvas package needed)
- AI tests: provider registry + key/settings persistence, OpenAI-compatible
  request construction with a mocked fetch, capability degradation, the daily
  free-tier counter (date rollover via fake timers), the feedback rule engine
  on synthetic documents, mock-generator determinism (same seed → same
  pixels), selection-bbox edit regions, speech feature detection with a
  mocked SpeechRecognition, speech-synthesis feature detection (`say.ts`),
  and the voice-command parser (every intent, filler tolerance, the full
  color vocabulary, unknown input → null)
- Accessibility tests: the voice executor against a fake store (each command
  maps to the right actions, clear confirmation flow, size clamping,
  localized messages), the UI-prefs store (kid-mode voice defaults,
  independent toggles, theme + recent-colors persistence, localStorage), and
  the i18n string table (interpolation, English/key fallbacks, en↔ar parity,
  RTL flag)
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
- Export tests: WebM mime fallback, filenames, progress and error paths with
  mocked recorder/canvas (MediaRecorder can't run in Node — it's isolated
  behind injectable deps in `ui/exportAnimation.ts`)
- Storage tests: real IndexedDB round-trips via `fake-indexeddb` (projects
  including image ops, animation frames, and the component library)
- React smoke test: `App` renders (jsdom)
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
  layer, kid mode, Arabic RTL, dark theme. Every test is independent (fresh
  browser context → empty localStorage/IndexedDB).
- `e2e/visual.spec.ts` — one full-page screenshot baseline of the welcome
  state (`e2e/visual.spec.ts-snapshots/`), committed as the CSS-regression
  guard. Thresholds are deliberately generous to absorb cross-platform font
  anti-aliasing; regenerate after intentional UI changes with
  `npx playwright test --update-snapshots`.

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
