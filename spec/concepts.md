# Concepts — the Dream domain model

The product's vocabulary. Every feature file uses these words with exactly
these meanings. Attribute spellings in the tables are **data contracts**:
they are the names used in saved projects and `.dream` files (see
`data/dream-file.md`), so a rebuild must keep them byte-compatible. Types
are descriptive (string, number, boolean, list) — choose any concrete
representation.

General conventions: colors are `#rrggbb` strings; all coordinates and
sizes are canvas pixels; timestamps are milliseconds since the Unix epoch.

## Document

The unit of work: one drawing / design / animation / app. A document is a
sized canvas with a background color and a stack of layers, optionally
extended with animation frames, app-mode links, and a game setup.

| Attribute                | Type                           | Default                         | Meaning                                                                                              |
| ------------------------ | ------------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`                     | string                         | generated                       | unique identity                                                                                      |
| `name`                   | string                         | `"Untitled"`                    | shown in the toolbar and dialogs                                                                     |
| `width`, `height`        | number                         | —                               | canvas size in pixels, integers ≥ 1 (new-document dialog: 1–4096; default preset 1024×768)           |
| `background`             | color                          | `#ffffff`                       | the canvas's base color                                                                              |
| `projectColors`          | list of ProjectColor, optional | absent = none                   | up to 24 named reusable colors that travel with this document                                        |
| `layers`                 | list of Layer                  | one empty layer named "Layer 1" | bottom-to-top paint order; when frames exist, this always mirrors the **active frame's** layer stack |
| `frames`                 | list of Frame, optional        | absent                          | presence = animation is on (see below)                                                               |
| `activeFrameId`          | string, optional               | —                               | which frame `layers` currently mirrors                                                               |
| `animation`              | AnimationSettings, optional    | absent = defaults               | playback + onion-skin preferences; outside undo                                                      |
| `mode`                   | workspace mode, optional       | `"draw"`                        | the workspace the project was last in; outside undo                                                  |
| `game`                   | GameSetup, optional            | absent = defaults               | Play-mode casting + settings; outside undo                                                           |
| `narration`              | Narration, optional            | absent = none                   | one voice take over the animation/presentation; outside undo                                         |
| `createdAt`, `updatedAt` | number                         | creation time                   | `updatedAt` is touched by every edit; drives library sorting                                         |

**Workspace modes** — `'draw' | 'design' | 'play' | 'present'`. Draw and
Design are persisted with the project; Play and Present are **session-only**:
a project saved while playing or presenting reopens in Draw.

## Project color

A reusable color saved with one document: a stable identity, a short name and
one exact color value. Project colors are shared through portable files and
agent workflows, unlike the per-device recent-colors row. Adding, renaming,
replacing or removing one is undoable. In Design mode, a project color may be
**linked** to a vector selection (stroke, shape or text). A linked operation
follows the swatch's current value on every render and every export, so editing
the swatch recolors all linked artwork at once. Unlinking, deleting the swatch,
or recoloring a linked op freezes its current resolved color back into the op,
so artwork never visually jumps when a link is severed.

## Layer

A named, ordered sheet of content. Layers stack bottom-to-top; each layer's
content is flattened for appearance, its editable adjustments and optional
painted mask are applied, then its opacity and blend mode determine how the
result combines with the visible artwork below it.

| Attribute     | Type                                                             | Default     | Meaning                                                           |
| ------------- | ---------------------------------------------------------------- | ----------- | ----------------------------------------------------------------- |
| `id`          | string                                                           | generated   |                                                                   |
| `name`        | string                                                           | `"Layer N"` | user-renameable                                                   |
| `visible`     | boolean                                                          | `true`      | hidden layers don't paint and can't be hit                        |
| `opacity`     | number 0–1                                                       | `1`         | multiplies the alpha of everything on the layer                   |
| `blendMode`   | `'normal'\|'multiply'\|'screen'\|'overlay'\|'darken'\|'lighten'` | `'normal'`  | combines this flattened layer with the artwork below              |
| `adjustments` | AdjustmentSettings                                               | all neutral | editable color and pixel effects; original operations stay intact |
| `mask`        | LayerMask, optional                                              | absent      | editable hide/reveal marks; original operations stay intact       |
| `locked`      | boolean                                                          | `false`     | locked layers reject all edits (adding, moving, deleting content) |
| `operations`  | list of Operation                                                | `[]`        | the layer's content, bottom-to-top paint order                    |

Layer add, delete, rename, reorder, visibility, opacity, blend-mode, adjustment,
mask and lock changes are all undoable.

## Operation

One committed mark on a layer. Five kinds:

| Kind       | Made by                                               | Essence                                                                                                             |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **stroke** | brush, pencil, eraser, spray                          | a polyline with width, color, round caps/joins; optionally per-point widths (pen pressure) and a spray seed/density |
| **shape**  | line, rectangle, ellipse tools                        | two corner points + outline width; rectangles/ellipses may instead be filled with the current color (no outline)    |
| **fill**   | flood fill (bucket)                                   | a contiguous filled region, baked to pixels at commit time                                                          |
| **text**   | text tool                                             | a string at an anchor point with font size and family                                                               |
| **image**  | image import, AI pixel edits, wand moves, AI pictures | a pixel rectangle placed at a position with a scale                                                                 |

Every operation carries: `id`, `color`, `opacity` (0–1, multiplied with the
layer's opacity), and an optional `groupId` (Design-mode grouping). Full
per-kind attribute tables: `data/document-schema.md`.

## Frame

Animation is a **flipbook**: when `frames` is present, each frame owns its
own complete layer stack (plus optional hotspots and presentation settings).
Presentation settings describe how a slide enters, whether it advances after
1–60 seconds, its short viewer-facing video caption, and presenter-only
speaker notes. The layers panel and all tools always edit the active frame. Turning animation on wraps the current
layer stack as frame 1; turning it off keeps only the active frame's stack.
Frame add/duplicate/delete/reorder are undoable; switching the active frame
is navigation and is not. Editing a frame's presentation settings is also
undoable.

## Hotspot

A tappable rectangle on a frame — the unit of App mode.

| Attribute       | Type                          | Default   | Meaning                                                                |
| --------------- | ----------------------------- | --------- | ---------------------------------------------------------------------- |
| `id`            | string                        | generated |                                                                        |
| `rect`          | rectangle                     | —         | tap area in canvas pixels; minimum committed size 4×4                  |
| `targetFrameId` | string                        | —         | the frame shown when tapped; **broken** if that frame no longer exists |
| `transition`    | `'none' \| 'fade' \| 'slide'` | `'fade'`  | how the target screen enters                                           |

Broken hotspots are flagged in the UI and ignored by previews and exports.

## Component

A named, reusable bundle of operations saved to the **cross-project
component library** (on-device, shared by all projects). Operations are
stored relative to the top-left of their content bounds. Inserting a
component places a **copy** on its own new layer — editing the component
later never updates already-placed instances (and vice versa).

## Group

A shared `groupId` on operations of one layer. Grouped operations select
and transform as one unit in Design mode. A group is a label, not a
container: no nesting, no scene graph, scoped to its layer.

## Cast role

Play mode turns layers into game pieces. Each template declares roles; a
role is either cast to a layer (that layer's visible content becomes the
sprite, cropped to its non-empty pixels) or left on Auto (a friendly
built-in stand-in is drawn). Roles: **hero** (all templates), **good**
(Catch!/Dream Jumper), **bad** (Catch!), **obstacle** (Flappy Dream/Dream
Jumper), **background** (all: a
specific layer, or the rest of the document as backdrop). Casting lives on
the document and is saved with the project, but — like the workspace mode —
outside undo: undo never re-casts your game.

## Project

A document saved in the on-device library. The library lists projects by
last-modified time, newest first, showing name, dimensions and date.
Projects are autosaved (see `data/storage.md`) and can be exported as
portable `.dream` files (see `data/dream-file.md`).

## Animation settings

| Attribute      | Type    | Default | Range                                  |
| -------------- | ------- | ------- | -------------------------------------- |
| `fps`          | number  | 6       | 1–24                                   |
| `loop`         | boolean | true    |                                        |
| `onionSkin`    | boolean | false   | ghost the previous frame while drawing |
| `onionNext`    | boolean | false   | also ghost the next frame              |
| `onionOpacity` | number  | 0.3     | 0–1 (UI slider: 5–80%)                 |

Saved with the project, outside undo.

## Narration

One voice take per document (`narration`): the recorded audio (a data URL)
plus its length. It starts at time 0 of the animation or presentation —
there is deliberately no per-frame track. Saved with the project, outside
undo (undo must never delete a recording), and it never leaves the device.
Full rules: `features/animation.md` §Voice narration.

## Game settings

| Attribute       | Meaning                                                     | Range   | Default (adult)                     | Default (kid mode)                  |
| --------------- | ----------------------------------------------------------- | ------- | ----------------------------------- | ----------------------------------- |
| `fallSpeed`     | base speed, px/s (Catch: fall; Flappy: flight; Jumper: run) | 60–400  | Catch 180 · Flappy 170 · Jumper 230 | Catch 110 · Flappy 120 · Jumper 170 |
| `spawnInterval` | seconds between spawns                                      | 0.4–2.5 | Catch 1.1 · Flappy 1.35             | Catch 1.6 · Flappy 1.8              |
| `lives`         | Catch/Jumper: lives; Flappy: shields                        | 1–9     | Catch 3 · Flappy 1 · Jumper 3       | Catch 5 · Flappy 3 · Jumper 5       |

Settings stay unset until the user touches a knob — that's how the gentler
kid defaults can apply. Full rules: `features/play.md`.
