# Dream

Dream is an intuitive, simple, elegant design app — as simple as MS Paint, as deep as
Photoshop, AI-assisted, and usable by anyone from a 5-year-old to a 90-year-old. It is
free, runs entirely in the browser, and will grow to support image editing, design mode
(layers/components), animation, presentations, videos, and even games. See `IDEA.md`
for the full product vision.

This repository currently contains **Slice 1**: the foundation and the core drawing
experience.

## What works today

- Brush, pencil, eraser with adjustable size, color (palette + custom) and opacity
- Line, rectangle and ellipse tools with Shift-to-constrain (45° lines, squares, circles)
- Flood fill (bucket), eyedropper color picker, and a click-to-type text tool
- Layers: add, delete, rename, reorder, visibility, opacity, lock — all undoable
- Undo/redo across every operation (200-step command history)
- Zoom (25%–800%) and pan (Space-drag, pan tool, wheel zoom anchored at the cursor)
- New document dialog (presets + custom size + background color)
- Autosave to IndexedDB, open/delete saved projects, export flattened PNG
- First-run hint overlay that dismisses on your first stroke
- Fully mouse- and touch-driven (Pointer Events), devicePixelRatio-crisp rendering

## Quickstart

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Script                 | What it does                                     |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Vite dev server                                  |
| `npm run build`        | Production build to `dist/`                      |
| `npm run preview`      | Serve the production build                       |
| `npm test`             | Run the test suite (Vitest)                      |
| `npm run test:watch`   | Watch-mode tests                                 |
| `npm run test:coverage`| Tests + engine coverage report                   |
| `npm run typecheck`    | `tsc --noEmit` (strict mode)                     |
| `npm run lint`         | ESLint (typescript-eslint + react-hooks)         |
| `npm run format`       | Prettier write                                   |
| `npm run check`        | typecheck + lint + test + build (what CI runs)   |

## Architecture map

```
src/
  engine/            Framework-free, pure TypeScript core (no DOM, no React)
    types.ts         Document, Layer, Operation (stroke/shape/fill/text), Point, Color…
    document.ts      Factories + immutable document/layer update helpers
    history.ts       Command-based undo/redo (invertible commands, no snapshots)
    renderer.ts      Renders a Document onto any 2D context (structural interface)
    geometry.ts      clamp, normalizeRect, constrainEnd (Shift), boundingRect…
    color.ts         hex <-> rgba, cssColor, built-in palette
    tools/           Pure tool state machines: stroke, shapes, fill (flood fill),
                     eyedropper, text, pan/zoom math — begin/update/preview/commit
  store/             Zustand store wrapping the engine (all mutations via History)
  ui/                React shell: toolbar (top), tool rail (left), canvas viewport,
                     options + layers panels (right), status bar (bottom), dialogs
  storage/           IndexedDB persistence via `idb` (save/load/list/delete projects)
  ai/                AIProvider interface + MockAIProvider + registry (BYOK later)
  styles/            Plain CSS, light theme, 44px+ touch targets
```

Data flow: pointer events → `ui/CanvasViewport` → tool state machines (`engine/tools`)
→ operations → `History.execute(command)` → new immutable `Document` in the Zustand
store → React re-renders → viewport redraws the document with `engine/renderer`.

## Keyboard shortcuts

`B` brush · `P` pencil · `E` eraser · `L` line · `R` rectangle · `O` ellipse ·
`G` fill · `I` eyedropper · `T` text · `H` pan · `Z` zoom ·
`Ctrl/Cmd+Z` undo · `Ctrl/Cmd+Shift+Z` / `Ctrl+Y` redo · `+`/`-` zoom ·
`Space` (hold) pan · `Shift` constrain shapes · `Esc` cancel text

## Testing

- Engine unit tests: history edge cases, flood fill, geometry, color, every tool,
  renderer (against a recording mock 2D context — no canvas package needed)
- Store tests: drawing flow, layers, undo/redo, viewport
- Storage tests: real IndexedDB round-trips via `fake-indexeddb`
- React smoke test: `App` renders (jsdom)
- Engine coverage is enforced at ≥80% (currently ~96% lines)

## Contributing

- Read `AGENTS.md` first — it defines the project conventions.
- The engine must stay framework-free and unit-tested; UI may depend on the engine,
  never the other way around.
- Run `npm run check` before opening a PR; CI runs the same on Node 22.
- Keep diffs minimal and match the surrounding code style (`npm run format`).
- See `ROADMAP.md` for the upcoming slices.
