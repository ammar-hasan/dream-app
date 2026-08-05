# Image editing

**Purpose.** Bring pictures in, then adjust, filter, crop, resize, flip and
rotate them — the Photoshop-depth half of "simple as Paint, deep as
Photoshop", all undoable.

## Image import

1. Three ways in: the **Import** button (file picker, multiple images
   allowed), **drag-and-drop** onto the canvas, **paste** from the
   clipboard. During a drag, the canvas distinguishes an importable image from
   unsupported content, names the result before release and refuses an invalid
   drop without changing the project.
2. Each image lands **centered on its own new layer**, scaled down to fit
   the canvas if larger (never upscaled), and becomes the active layer.
3. Import is one undoable change per image. Pixels survive save/load
   round-trips (opaque pixels exactly; see the alpha caveat in
   `../data/dream-file.md`).

## The Adjust panel (filters & adjustments)

Sliders with a **live preview**; an **Editable** label explains that the effect
does not flatten the original marks. **Apply** saves the settings on the active
layer as one undoable change; **Cancel** returns to the last saved settings.
Reopening Adjust restores those values so they can be refined or reset later.
Presets choose the same editable settings rather than replacing content.

| Adjustment | Range     | Perceptual meaning                                   |
| ---------- | --------- | ---------------------------------------------------- |
| Brightness | −100…100  | add/subtract light; ±100 ≈ ±255 channel shift scaled |
| Contrast   | −100…100  | spread/gather tones around mid-gray                  |
| Saturation | −100…100  | −100 = gray, +100 = doubled chroma                   |
| Hue        | −180…180° | rotate the color wheel, luminance-preserving         |
| Grayscale  | 0–100     | mix toward luminance gray                            |
| Sepia      | 0–100     | mix toward the classic warm-brown photo tone         |
| Invert     | 0–100     | mix toward the color negative                        |
| Blur       | 0–20 px   | box blur, softens detail (also softens edges)        |
| Sharpen    | 0–100     | mix toward a crispness kernel, restores edge pop     |

- Adjustments apply in a **fixed order** regardless of slider order: hue →
  saturation → brightness → contrast → grayscale → sepia → invert → blur →
  sharpen. Same slider values, same pixels, every time.
- The active layer is flattened for appearance with its opacity, then its
  adjustments and blend mode are applied in that order. Original strokes, shapes,
  text and pixels stay independently editable, and future marks on the layer
  receive the same saved effect. Transparency is preserved (except blur, which
  softens transparent edges too).
- A locked layer exposes its saved appearance but refuses adjustment and
  transform changes. An empty layer has nothing to adjust.

### Presets (exact recipes)

| Preset  | Recipe                                |
| ------- | ------------------------------------- |
| B&W     | grayscale 100                         |
| Vintage | sepia 70, contrast 15, brightness −5  |
| Cool    | hue −15, saturation 10, brightness 5  |
| Warm    | sepia 25, saturation 10, brightness 5 |

## The Effects stack

Each layer carries an optional ordered **effect stack** beyond its color
adjustments. Today the single effect is a **drop shadow**; the stack is
reorderable and toggleable so further effects can be added without a rewrite.

- A drop shadow casts the layer's own alpha silhouette behind it, blurred and
  offset by the effect's params (color, opacity 0–1, blur radius 0–40 px,
  offset X/Y −40–40 px). It paints below the layer content and never replaces
  the operations.
- Effects are applied after adjustments and the layer mask, and before the
  layer's blend mode — so a shadow on a multiply layer still casts normally
  beneath it.
- Add / remove / toggle / reorder are each one undoable step. Editing a
  shadow's sliders previews live through the same compositor and commits one
  step on release (one drag = one undo).
- Effects travel in `.dream` files and are sanitized on load (unknown types
  and out-of-range params are dropped or clamped). An empty or all-disabled
  stack costs nothing at render time.

## Move, flip, rotate (per layer)

- The **Move tool (M in Draw mode, V in Draw mode)** drags the active
  layer's entire content. One drag = one undoable change. Its pointer is an
  open hand before the drag and a closed hand while the layer follows it.
- **Flip horizontal / flip vertical / rotate 90° CW / rotate 90° CCW** act
  on the active layer, around the center of **the layer's own content**, so
  the content stays in place (it does not orbit the canvas center).
- Text stays upright after a flip/rotate (its anchor moves, glyphs don't
  mirror). Pixel content is re-baked pixel-perfectly for 90° steps.

## Crop (C)

1. Drag a rectangle over the canvas; the outside dims.
2. **Enter** or **Apply** commits; **Esc** cancels.
3. Cropping shrinks the whole document: every layer of **every frame**
   shifts into the new bounds; pixel content is clipped exactly.

## Resize

A dialog scales the whole document (and all its content, on **every
frame**) to a new size. Strokes, shapes and text scale geometrically
(stroke width and font size scale by the average of the x/y factors);
pixel content resamples with **nearest-neighbor** (crisp, pixel-art
faithful — no blur). Undo restores the previous document exactly.

## Generative fill and erase

An edits-capable connected AI can change the active layer from plain words.
With a Design-mode selection and **Selected part only** on, its bounding box
is the edit area; the model receives surrounding visual context, but every
pixel outside the box is preserved exactly. Without a selection, the whole
layer is editable. The result is baked once and one Undo restores the exact
previous layer.

**Erase this** is the one-tap preset: remove the selected object and fill its
space naturally from the surrounding background. It is shown only for a
connected provider that explicitly declares generative editing. The built-in
offline assistant continues to offer deterministic filters and never presents
itself as generative.

## Still-image export

- **PNG** — lossless, transparency preserved. Filename `{name}.png`.
- **JPEG** — quality slider 10–100, default 92. Filename `{name}.jpg`.
- **SVG** — scalable background, visible layers, freehand and pressure-width
  strokes, spray, shapes, connector ends and text from the active canvas or
  frame. Layer and mark opacity, authored dimensions and document name are
  preserved. Filename `{name}.svg`.
- **Brand pack** — one `{safe-name}-brand-pack.zip` containing the active
  canvas as `{safe-name}-source.png`, plus aspect-preserving PNGs whose long
  edges are exactly 1024 px and 512 px. A genuinely scalable
  `{safe-name}.svg` joins the pack whenever the visible artwork qualifies for
  ordinary SVG export. Unsafe filename characters become hyphens.
- PNG and JPEG flatten the document background plus every visible layer,
  bottom to top — exactly what the canvas shows.
- Every brand-pack PNG preserves that same visible composition; resizing is
  export-only and never changes the document. Pixel or eraser content omits
  only the SVG member rather than blocking the complete pack.
- SVG is offered only when every visible mark can remain genuinely scalable.
  A visible imported or generated pixel image, baked flood fill, non-neutral
  editable adjustment or eraser mark disables its Export action and explains
  that PNG remains available. Unsupported content on a hidden layer does not
  block a truthful SVG of what is visible.

## Edge cases

- Adjust/Apply on an empty or locked layer is refused kindly; Cancel remains a
  safe exit from any uncommitted preview.
- Crop/resize on an animated document applies to every frame and is a
  single undo step.
- Rotating a selection that contains rectangles, ellipses or pixel content
  is a Design-mode concern — see `design-mode.md` (90° steps only).
- Importing while kid mode is on: the adult Import button is hidden; kid
  mode has no import path (by design — no reading-heavy dialogs).
- A connected provider without an edits model cannot offer generative fill or
  erase; the existing offline filter path remains available.
