# Dream

Dream is an intuitive, simple, elegant design app — as simple as MS Paint, as deep as
Photoshop, AI-assisted, and usable by anyone from a 5-year-old to a 90-year-old. It is
free, runs entirely in the browser, and will grow to support image editing, design mode
(layers/components), animation, presentations, videos, and even games. See `IDEA.md`
for the full product vision.

This repository currently contains **Slice 1** (foundation + core drawing),
**Slice 2** (image editing: import, filters, crop & transform), **Slice 3**
(design mode: selection, components, alignment) and **Slice 4** (animation,
video export and presentation mode).

## What works today

- Brush, pencil, eraser with adjustable size, color (palette + custom) and opacity
- Line, rectangle and ellipse tools with Shift-to-constrain (45° lines, squares, circles)
- Flood fill (bucket), eyedropper color picker, and a click-to-type text tool
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
- Zoom (25%–800%) and pan (Space-drag, pan tool, wheel zoom anchored at the cursor)
- New document dialog (presets + custom size + background color)
- Autosave to IndexedDB (imported images included), open/delete saved projects,
  export flattened PNG or JPEG (with quality setting)
- First-run hint overlay that dismisses on your first stroke
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
- **Present mode**: the mode pill is now Draw / Design / Present. Present
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

## Design mode

The Draw / Design switch in the top toolbar moves between two workspaces. Draw
is the default MS-Paint-simple experience, exactly as before. Design mode is the
pro workspace — the mode is persisted per project.

- **Select tool (V)**: click any object on the active layer to select it
  (strokes, shapes, text, images, fills — topmost wins). Shift-click toggles,
  drag on empty canvas rubber-band-selects. The selection shows per-object
  boxes plus a shared bounding box with handles.
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

## Quickstart

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Script                  | What it does                                   |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Vite dev server                                |
| `npm run build`         | Production build to `dist/`                    |
| `npm run preview`       | Serve the production build                     |
| `npm test`              | Run the test suite (Vitest)                    |
| `npm run test:watch`    | Watch-mode tests                               |
| `npm run test:coverage` | Tests + engine coverage report                 |
| `npm run typecheck`     | `tsc --noEmit` (strict mode)                   |
| `npm run lint`          | ESLint (typescript-eslint + react-hooks)       |
| `npm run format`        | Prettier write                                 |
| `npm run check`         | typecheck + lint + test + build (what CI runs) |

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
    filters.ts       Pure pixel filters/adjustments over RGBA buffers (+ convolution)
    transform.ts     Flip/rotate/translate/crop/resize for buffers, layers, documents
    selection.ts     Design mode: hit-testing, marquee, move/scale/rotate math,
                     snapping, align/distribute, groups, component factories
    geometry.ts      clamp, normalizeRect, constrainEnd (Shift), boundingRect…
    color.ts         hex <-> rgba, cssColor, built-in palette
    tools/           Pure tool state machines: stroke, shapes, fill (flood fill),
                     eyedropper, text, pan/zoom math — begin/update/preview/commit
  store/             Zustand store wrapping the engine (all mutations via History)
  ui/                React shell: toolbar (top) with the Draw/Design/Present
                     switch + Animate toggle, tool rail (left), canvas viewport,
                     options + design + components + adjust + layers panels
                     (right), timeline bar + status bar (bottom), PresentView
                     (fullscreen slides), dialogs, image/video/sprite export
  storage/           IndexedDB via `idb`: projects + the cross-project
                     component library (one shared connection in db.ts)
  ai/                AIProvider interface + MockAIProvider + registry (BYOK later)
  styles/            Plain CSS, light theme, 44px+ touch targets
```

Data flow: pointer events → `ui/CanvasViewport` → tool state machines (`engine/tools`)
→ operations → `History.execute(command)` → new immutable `Document` in the Zustand
store → React re-renders → viewport redraws the document with `engine/renderer`.

## Keyboard shortcuts

`V` select (Design) / move (Draw) · `M` move · `B` brush · `P` pencil · `E` eraser ·
`L` line · `R` rectangle · `O` ellipse · `G` fill · `I` eyedropper · `T` text ·
`C` crop · `H` pan · `Z` zoom ·
`Ctrl/Cmd+Z` undo · `Ctrl/Cmd+Shift+Z` / `Ctrl+Y` redo · `+`/`-` zoom ·
`Space` (hold) pan — inside the focused timeline it toggles play instead ·
`Shift` constrain shapes · `Enter` apply crop ·
`Esc` clear selection / cancel text/crop

Design mode, with a selection: `Ctrl/Cmd+D` duplicate · `Ctrl/Cmd+G` group ·
`Ctrl/Cmd+Shift+G` ungroup · `Del`/`Backspace` delete · arrow keys nudge
(`Shift` = 10px)

Present mode: `→` / `Space` / click next slide · `←` previous · `Esc` exit

## Testing

- Engine unit tests: history edge cases, flood fill, geometry, color, filters,
  transforms (crop/resize/flip/rotate), every tool, selection (hit-testing per
  op kind, marquee, scale/rotate math, snapping, align/distribute, groups,
  components), animation (frame model, CRUD commands + undo, playback timing,
  onion-skin decisions, sprite-sheet layout), renderer (against a recording
  mock 2D context — no canvas package needed)
- Store tests: drawing flow, layers, image import/move/adjust/crop/resize,
  design mode (mode switching, select gestures, transform handles, selection
  actions, component insert), animation (frame switching, cross-frame undo,
  playback state, present mode), undo/redo
- Export tests: WebM mime fallback, filenames, progress and error paths with
  mocked recorder/canvas (MediaRecorder can't run in Node — it's isolated
  behind injectable deps in `ui/exportAnimation.ts`)
- Storage tests: real IndexedDB round-trips via `fake-indexeddb` (projects
  including image ops, animation frames, and the component library)
- React smoke test: `App` renders (jsdom)
- Engine coverage is enforced at ≥80% (currently ~97% lines)

## Contributing

- Read `AGENTS.md` first — it defines the project conventions.
- The engine must stay framework-free and unit-tested; UI may depend on the engine,
  never the other way around.
- Run `npm run check` before opening a PR; CI runs the same on Node 22.
- Keep diffs minimal and match the surrounding code style (`npm run format`).
- See `ROADMAP.md` for the upcoming slices.
