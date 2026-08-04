# Drawing

**Purpose.** The heart of Dream: pick a tool, make marks. Every tool works
with mouse, touch and stylus, commits through the shared undo history, and
feels immediate on a 5-year-old's tablet and a pro's pen display alike.

## Shared behavior

1. Every tool gesture produces a live preview while dragging and commits
   exactly one undoable change on release (a mirrored gesture or a stamp is
   still **one** undo step).
2. A single tap with a stroke tool paints a visible dot (round cap).
3. Tool settings — color, size (1–64 px), opacity (0–1) and steady stroke
   (0–100%) — live in the options panel and are session-only. Session defaults:
   color `#1f2937`, size 8, opacity 1 and steady stroke 0%.
4. All stroke tools paint with round line caps and joins.
5. The color UI offers a 16-color palette, a custom color picker, and a
   recent-colors row (last 8, newest first, persisted per user). A separate
   **Project colors** group can save the current color under an editable name,
   select it, replace its exact value or remove it. Up to 24 travel with the
   project; every list change is undoable. Replacing or removing a swatch never
   changes marks that already used its old value. Each row reports its exact
   normal-size text contrast against the current opaque canvas background and
   marks AA only at an unrounded ratio of at least 4.5:1. This is guidance for
   ordinary opaque text only—not a pass for artwork, transparency, large text,
   color-vision accessibility or print.
6. Locked or hidden layers reject edits; the status area says why.
7. On a hovering pointer, Brush, Pencil, Eraser and Spray replace the generic
   cursor over the document with a high-contrast ring at the exact current
   diameter plus a small center point. It follows the pointer without lag,
   disappears on leave, never enters history and never becomes part of an
   export. Once drawing begins the ring remains but the center point gets out
   of the live mark's way. Layer-mask painting uses the same footprint.

## The tools

### Brush (B)

Two session-only tips share the same Brush tool and opacity:

- **Round** (default): a uniform round stroke. With a stylus, width responds
  to pen pressure (see below).
- **Calligraphy nib:** a fixed 45° broad nib. Marks travelling along the nib
  edge are thin; marks crossing it are broad, so mouse and touch gestures
  gain calligraphic thick/thin rhythm without special hardware. Stylus
  pressure multiplies that directional width rather than replacing it.

Switching tips changes only future marks. Every calligraphy gesture remains
one ordinary undoable stroke and reproduces identically in previews, saved
projects and exports.

Four compact presets set the complete future-brush feel in one action:
**Fine ink** (4 px, fully opaque, round, 35% steady), **Soft marker** (18 px,
55%, round, 10% steady), **Bold paint** (32 px, 85%, round, natural) and
**Calligraphy** (16 px, fully opaque, broad nib, 60% steady). The exact size,
opacity, tip and steadiness remain visible and independently editable; changing
any of them simply clears the preset's selected state.
Presets never rewrite existing marks and are session-only like the controls
they combine.

### Pencil (P)

Hard, always fully opaque round stroke, regardless of the opacity setting.
Pressure-capable like the brush.

### Eraser (E)

Removes content with a round stroke, always fully opaque. **The eraser
erases to transparency** — it removes everything below it, including the
document background (erased areas export as transparent pixels). This is
deliberate: the eraser is a subtractive tool, not a background-color brush.
Pressure-capable.

### Spray (S)

An airbrush: a mist of small dots scattered along the stroke path.

- Dot radius region: dots fall uniformly within a disc of radius `size/2`
  around the stroke path.
- Dot size: `max(1, round(size/8))` px squares.
- Density slider 1–100 (default 40): dots per step = `max(1, round(density/8))`.
- Honors the opacity setting.
- **Deterministic:** every spray stroke carries a random seed rolled at the
  start of the gesture; the same stroke redraws — in the viewport, in
  thumbnails, in every export — with the identical mist.

### Line / Rectangle / Ellipse (L / R / O)

Drag from one corner to the other; release commits. A zero-length drag
commits nothing.

- **Shift constrains:** lines snap to the nearest 45° angle (length
  preserved); rectangles become squares and ellipses become circles.
- Lines offer three session-only end styles: **Plain**, **Arrow** at the drag
  endpoint, and **Arrows both ways**. The chosen ends belong to the committed
  line, remain attached when it is transformed, and undo with that line.
- Outline width is the current size.
- **Fill shapes toggle** (options panel): rectangles and ellipses commit
  filled with the current color and **no outline**. Lines are unaffected.

### Flood fill (G)

Click to fill the contiguous region of matching color on the active layer
with the current color.

- Match rule: a pixel joins the region when each of its red, green, blue
  **and alpha** channels is within the tolerance of the clicked pixel.
  Tolerance default: 0 (exact match only).
- The fill is baked to pixels at commit time (a raster region), so it
  stays put even if the content around it later changes.
- Clicking a region that already is the fill color does nothing (no undo
  step, no change).

### Magic wand (W)

Click a pixel to lift the contiguous similar-colored region of the active
layer into a **floating patch**.

- Tolerance slider, default 32, per-channel 0–255 (same match rule as
  flood fill). Perceptually: 0 selects only the exact color; 32 selects a
  flat color and its near shades (anti-aliased edges, lightly textured
  fills); very high values swallow most of the layer.
- While floating: **drag** moves it, **Delete/Backspace** removes it,
  **"Copy to new layer"** duplicates it onto its own layer, **Esc** puts it
  back where it came from. The document is untouched until one of these
  resolves.
- Move and delete bake the whole layer to pixels (the same destructive-bake
  model as filters) — each outcome is one undoable change.

### Eyedropper (I)

Click anywhere to make the active layer's color at that point the current
color (transparency ignored).

### Text (T)

Click to place an anchor, type, and commit. Committed text is trimmed;
empty text commits nothing. Font size default 24 px; five named font
choices: Sans, Serif, Mono, Handwritten and Persian script. The Persian
choice prefers an installed Nastaliq or Arabic-script text face and falls
back to a broadly available script-capable face. Esc cancels an in-progress
text. Opening the text entry keeps it focused after the placement click and
dismisses first-run guidance so the writing area is unobstructed. A compact
science strip beside the entry inserts `₂`, `₃`, `⁺`, `⁻`, `→`, `⇌`, `Δ`,
`°` or `μ` at the caret, replacing any selected characters; focus returns to
the entry so typing can continue.

### Stamp (N)

Click-to-place one of twelve built-in doodles. No assets — each stamp is a
chunky, multi-color drawing composed from shapes and strokes, so it scales
crisply and its colors are fixed and friendly.

- The twelve: **star, heart, smiley, flower, sun, moon, cloud, tree, fish,
  butterfly, cat, rocket**.
- Sizes (bounding box): **Small 48 px, Medium 96 px, Big 160 px**.
- One click = one undoable placement on the active layer.
- All parts of one stamp are grouped, so Design mode selects and moves the
  whole doodle as one object.
- The picker is shared by the adult options panel and the kid panel (big
  grid, spoken names in kid mode).

### Starter scenes ("Start with a picture")

The stamp picker also offers three coloring-book starter scenes — black
outline art sized to the document, inserted as a **new layer**, ready to
color in with brush or fill: **Sunny garden, Night sky, Under the sea**.
Insertion is undoable.

## Mirror / symmetry

An options-panel mode: **off / vertical / horizontal / quad**. While on,
every brush, pencil, eraser, spray, line, rectangle and ellipse gesture is
reflected live across the canvas center axes (vertical mirror flips left↔
right across the vertical center line; horizontal flips top↔bottom; quad
does both).

- Soft dashed accent lines show the active mirror axes while drawing.
- Mirrored marks are real operations committed **together with the
  original in one undoable change** — a single undo removes the whole
  symmetric bloom.
- Text, fill, images and stamps are never mirrored.
- Session-only (like zoom): not saved with the project.

## Pen pressure

With a stylus, brush, pencil and eraser strokes modulate width per pointer
sample: effective width = size × pressure, clamped to a 0.1–1 multiplier,
interpolated smoothly between points (segment width is the average of its
two endpoints' multipliers, never below 0.5 px). Mouse and touch strokes
carry no pressure data and render at uniform width.

## Steady stroke

Brush, pencil and eraser share a session-only **Steady stroke** control from
0–100%. At 0%, the sampled path is unchanged. Raising it progressively reduces
small wobbles while the start and current pointer endpoint stay fixed, so the
mark remains directly controlled rather than drifting away from the gesture.
The live preview and released mark use the same path; pressure and calligraphic
width continue to follow it. The setting affects only future strokes, every
result remains one undoable mark, and Spray keeps its natural sampled path. A
person may also say or type “steady my stroke” to choose 60% assistance or
“natural stroke” to return to 0%; these use the same visible control rather than
creating a hidden voice-only state.

## Zoom & pan

- Zoom range **25%–800%**, stepped ladder: 25, 33, 50, 67, 100, 150, 200,
  300, 400, 600, 800%.
- Mouse-wheel zoom anchors at the cursor (the point under the cursor stays
  put). `+`/`-` keys and the zoom pill step the ladder.
- Pan: hold Space and drag, use the pan tool (H), or drag with the pan
  tool on touch.
- The floating **zoom pill** (bottom-end of the canvas, hidden in kid
  mode): `−`, the current percent, `+`; tapping the percent fits the
  document to the window (fit = the largest zoom that leaves 24 px margins
  on every side).

## The built-in palette (16 colors)

`#000000` `#6b7280` `#9ca3af` `#ffffff` `#7c2d12` `#b45309` `#dc2626`
`#f97316` `#facc15` `#16a34a` `#0d9488` `#2563eb` `#4f46e5` `#9333ea`
`#db2777` `#f9a8d4`

(Kid mode uses its own 12-color bright palette — see `accessibility.md`.)

## Edge cases

- Drawing while an animation is playing does nothing — playback is
  watching, not editing; pause first.
- Drawing on a locked or hidden layer is refused with a friendly status
  message.
- Tool gestures that would commit nothing (zero-length shape, empty text,
  fill on the same color) leave no trace in undo history.
- Switching tools mid-gesture cancels the in-progress gesture.
- Spray strokes keep their seed through undo/redo, save/load and export:
  the mist never re-randomizes.
