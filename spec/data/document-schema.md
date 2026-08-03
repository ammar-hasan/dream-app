# Document schema — the full attribute bible

Every persisted attribute of every concept, with defaults and valid ranges.
Attribute spellings are **data contracts** (they appear verbatim in saved
projects and `.dream` files). Concept definitions: `../concepts.md`. File
serialization: `dream-file.md`.

Colors are `#rrggbb`. Coordinates and sizes are canvas pixels. Optional
attributes marked `?` are simply absent when unset — readers must treat
absent as the default, and writers may omit defaults.

## Document

| Attribute                 | Type                                  | Default             | Valid range / rule                                               |
| ------------------------- | ------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| `id`                      | string                                | generated           | unique per document                                              |
| `name`                    | string                                | `"Untitled"`        | trimmed; empty falls back to `"Untitled"`                        |
| `width` / `height`        | number                                | —                   | integers ≥ 1; the new-document dialog allows 1–4096              |
| `background`              | color                                 | `#ffffff`           |                                                                  |
| `layers`                  | Layer[]                               | one layer "Layer 1" | bottom-to-top; mirrors the active frame when `frames` is present |
| `frames?`                 | Frame[]                               | absent              | absent = animation off                                           |
| `activeFrameId?`          | string                                | —                   | must reference an existing frame                                 |
| `animation?`              | AnimationSettings                     | absent = defaults   | outside undo                                                     |
| `narration?`              | Narration                             | absent = none       | outside undo; audio stored as a data URL                         |
| `mode?`                   | `'draw'\|'design'\|'play'\|'present'` | `'draw'`            | `'play'`/`'present'` reopen as `'draw'`                          |
| `game?`                   | GameSetup                             | absent = defaults   | outside undo                                                     |
| `createdAt` / `updatedAt` | number (ms epoch)                     | creation time       | `updatedAt` bumps on every edit                                  |

## Layer

| Attribute    | Type        | Default                 | Rule                                    |
| ------------ | ----------- | ----------------------- | --------------------------------------- |
| `id`         | string      | generated               |                                         |
| `name`       | string      | `"Layer"` / `"Layer N"` | user-renameable                         |
| `visible`    | boolean     | `true`                  |                                         |
| `opacity`    | number      | `1`                     | 0–1; multiplies every operation's alpha |
| `locked`     | boolean     | `false`                 | rejects all content edits               |
| `operations` | Operation[] | `[]`                    | bottom-to-top paint order               |

## Operation — shared base

| Attribute  | Type                                         | Default      | Rule                                                                        |
| ---------- | -------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `id`       | string                                       | generated    |                                                                             |
| `kind`     | `'stroke'\|'shape'\|'fill'\|'text'\|'image'` | —            |                                                                             |
| `color`    | color                                        | —            | erasers carry a color but ignore it                                         |
| `opacity`  | number 0–1                                   | tool setting | multiplied with layer opacity; pencil and eraser strokes always commit at 1 |
| `groupId?` | string                                       | absent       | Design-mode grouping; scoped to the layer                                   |

### Stroke (`kind: 'stroke'`)

| Attribute  | Type                                   | Default | Rule                                                                                        |
| ---------- | -------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `tool`     | `'brush'\|'pencil'\|'eraser'\|'spray'` | —       | brush & spray honor opacity; pencil & eraser are always fully opaque                        |
| `points`   | Point[]                                | —       | ≥ 2 (a single tap stores the point twice so it paints a dot)                                |
| `size`     | number                                 | —       | stroke width in canvas px; tool range 1–64                                                  |
| `widths?`  | number[]                               | absent  | per-point pressure multipliers, same length as `points`, each 0.1–1; absent = uniform width |
| `seed?`    | number                                 | —       | spray only: the stroke's random seed; makes every redraw identical                          |
| `density?` | number 1–100                           | 40      | spray only                                                                                  |

### Shape (`kind: 'shape'`)

| Attribute     | Type                             | Default | Rule                                                                |
| ------------- | -------------------------------- | ------- | ------------------------------------------------------------------- |
| `shape`       | `'line'\|'rectangle'\|'ellipse'` | —       |                                                                     |
| `from` / `to` | Point                            | —       | the two dragged corners; order-independent                          |
| `size`        | number                           | —       | outline width                                                       |
| `fill?`       | boolean                          | absent  | rectangle/ellipse only: interior painted in `color`, **no outline** |
| `lineStyle?`  | `'arrow'\|'double-arrow'`        | absent  | line only: head at `to`, or heads at both endpoints                 |

### Fill (`kind: 'fill'`)

A flood fill baked to pixels when committed.

| Attribute | Type         | Rule                                                                                                      |
| --------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| `origin`  | Point        | where the user clicked                                                                                    |
| `patch`   | raster patch | bounding box of the filled region; pixels are the fill color at alpha 255, transparent outside the region |

### Text (`kind: 'text'`)

| Attribute    | Type   | Default     | Rule                                                                     |
| ------------ | ------ | ----------- | ------------------------------------------------------------------------ |
| `position`   | Point  | —           | top-left anchor of the first line                                        |
| `text`       | string | —           | trimmed on commit; empty commits nothing                                 |
| `fontSize`   | number | 24          | canvas px                                                                |
| `fontFamily` | string | system sans | one of the named choices: Sans, Serif, Mono, Handwritten, Persian script |

### Image (`kind: 'image'`)

Imported images, baked filter results, wand moves, AI pictures.

| Attribute | Type         | Rule                                             |
| --------- | ------------ | ------------------------------------------------ |
| `patch`   | raster patch | the pixels; `patch.x/y` = top-left on the canvas |
| `scale`   | number       | render-time scale of the patch (1 = native size) |

**Raster patch**: `{ x, y, width, height, data }` where `data` is RGBA
bytes, length `width × height × 4`, row-major.

## Frame

| Attribute       | Type              | Rule                                                   |
| --------------- | ----------------- | ------------------------------------------------------ |
| `id`            | string            |                                                        |
| `layers`        | Layer[]           | the frame's own complete stack                         |
| `hotspots?`     | Hotspot[]         | absent on frames without links                         |
| `presentation?` | SlidePresentation | absent when every slide/delivery setting is at default |

## SlidePresentation

| Attribute     | Type                      | Default  | Rule                                                              |
| ------------- | ------------------------- | -------- | ----------------------------------------------------------------- |
| `transition?` | `'none'\|'fade'\|'slide'` | `'none'` | how this slide enters                                             |
| `durationMs?` | number                    | absent   | 1,000–60,000; absent means manual advance                         |
| `notes?`      | string                    | absent   | presenter-only plain-text speaker notes                           |
| `caption?`    | string                    | absent   | on-screen video caption; authoring controls cap at 160 characters |

## Hotspot

| Attribute       | Type                      | Default   | Rule                                            |
| --------------- | ------------------------- | --------- | ----------------------------------------------- |
| `id`            | string                    | generated |                                                 |
| `rect`          | rectangle                 | —         | canvas px; drags smaller than 4×4 are discarded |
| `targetFrameId` | string                    | —         | broken when the frame is deleted                |
| `transition`    | `'none'\|'fade'\|'slide'` | `'fade'`  |                                                 |

## AnimationSettings

| Attribute      | Type    | Default | Range                          |
| -------------- | ------- | ------- | ------------------------------ |
| `fps`          | number  | 6       | 1–24 (clamped, rounded)        |
| `loop`         | boolean | `true`  |                                |
| `onionSkin`    | boolean | `false` |                                |
| `onionNext`    | boolean | `false` |                                |
| `onionOpacity` | number  | 0.3     | 0–1 (clamped); UI slider 5–80% |

## Narration

One voice take per document, starting at time 0 of the animation (see
`../features/animation.md` §Voice narration).

| Attribute    | Type   | Rule                                                                                       |
| ------------ | ------ | ------------------------------------------------------------------------------------------ |
| `audio`      | string | the take as a data URL (`data:audio/webm;base64,…`; codec depends on the recording device) |
| `durationMs` | number | take length in milliseconds                                                                |

Takes over ~10 MB earn a size warning in the UI.

## GameSetup

| Attribute   | Type                                      | Default   | Rule                                                  |
| ----------- | ----------------------------------------- | --------- | ----------------------------------------------------- |
| `template?` | `'catch'\|'flappy'\|'maze'\|'platformer'` | `'catch'` | unknown/absent → Catch!                               |
| `cast`      | GameCast                                  | `{}`      | uncast roles use built-in stand-ins                   |
| `settings?` | GameSettings                              | absent    | absent until a knob is touched (enables kid defaults) |

- **GameCast** (all optional layer ids): `hero`, `good` (Catch!/Jumper),
  `bad` (Catch! only), `obstacle` (Flappy/Jumper), `background`.
- **GameSettings**: `fallSpeed` (px/s, 60–400), `spawnInterval` (seconds,
  0.4–2.5, rounded to 0.1), `lives` (1–9). All clamped. Defaults per
  template and audience: see `../concepts.md` §Game settings.

## Component (cross-project library entry)

| Attribute                 | Type        | Rule                                                               |
| ------------------------- | ----------- | ------------------------------------------------------------------ |
| `id` / `name`             | string      | rename ignores empty names                                         |
| `operations`              | Operation[] | relative to (0,0) = top-left of content bounds; group ids stripped |
| `width` / `height`        | number      | native content size                                                |
| `createdAt` / `updatedAt` | number      |                                                                    |

## Tool defaults (session state, not persisted)

New sessions start with: color `#1f2937`, brush size 8, Round brush tip,
opacity 1, font size 24, Sans font, fill-shapes off, plain line ends, spray
density 40, symmetry off.

## The frame invariant (serialization rule)

When `frames` is present, the serialized `layers` array always mirrors the
**active** frame's serialized layer stack. Readers may rely on it; writers
must maintain it. This keeps old readers (which only know `layers`) showing
the active frame of a newer animated file.
