# Design mode

**Purpose.** The pro workspace: treat what's on a layer as objects — select,
move, scale, rotate, align, group, and save selections as reusable
components. Draw mode stays untouched; Design mode is opt-in per project.

## Entering

The workspace switch (Draw / Design / Play / Present) moves to Design; the
choice is saved with the project. Design mode reveals the Select, Lasso and
Link tools, the Design panel, the Links panel and the Components panel.

After an adult's first successful drawing gesture, one compact invitation asks
whether they want to move or change what they just made. **Select it** enters
this same Design workspace, activates Select and selects exactly the marks
created by that gesture. It is a navigation/selection handoff, not an edit, so
one Undo still removes the drawing itself. Selecting, closing, continuing to
draw or finding Design independently dismisses the invitation permanently on
that device. It does not appear for Little Dreamer, empty gestures, restored
artwork or later drawings. A successful handoff may add one optional tactile
cue, always alongside the visible selection. After either invitation action
removes the temporary controls, keyboard focus lands on the active workspace
tab.

## Layer blending

The active layer's detail controls add **Blend** only in Design. Normal keeps
the layer's authored colors; Multiply, Screen, Overlay, Darken and Lighten
combine its flattened appearance with the visible artwork beneath it. Choosing
a mode updates the canvas immediately and is one undoable document change.

Blend mode applies consistently to the working canvas, every flattened image,
animation, presentation, prototype and scalable export. It is saved with the
project and remains editable after reopening. Older projects and layers without
an explicit mode open as Normal. Hidden layers do not blend; layer opacity is
applied before the flattened layer is combined with the artwork below.

In-progress drawing, whole-layer movement, selection transforms, adjustment previews
and wand movement remain inside the owning layer at its real stack position.
Their live appearance therefore includes that layer's opacity and blend mode
before release or Apply; committing the gesture must not cause a surprise jump
in color or stacking.

## Layer masks

The active layer can have one painted mask in Design. A new mask starts fully
revealed, so adding it never changes the picture. The Layers panel then names
the current editing target explicitly as **Artwork** or **Mask**; Mask offers
**Hide** and **Reveal** brush modes and reports how many mask marks exist.

Mask painting uses the current brush size and opacity. Its crosshair pointer,
status-bar label and live canvas preview all identify the mask target before
release. Hide reduces the owning layer's visibility under the stroke; Reveal
restores it. Neither action erases or replaces the layer's operations or
editable adjustments. Each mask mark, adding the mask, enabling or disabling
it, and deleting it is one undoable document change. A locked layer refuses all
of these edits.

Masks follow their layer through movement, flips, quarter-turn rotation,
cropping, resizing, frames, save/open and portable project exchange. They
affect the working canvas, animation, presentations, prototypes and flattened
image delivery after the layer's editable adjustments and before its opacity
and blend mode. A visible painted mask makes scalable export unavailable rather
than silently flattening or misrepresenting the result.

## Selection

1. **Select tool (V):** click any object on the active layer to select it
   — strokes, shapes, text, images, fills; the **topmost** object at the
   point wins (with a 5 px grab tolerance at 100% zoom, scaled with zoom).
2. **Shift-click** toggles objects in and out of the selection.
3. **Drag on empty canvas** rubber-band-selects every object whose bounds
   **intersect** the marquee.
4. **Lasso (K):** draw a freehand loop; objects whose bounds' **center**
   falls inside the loop are selected (center-based, so a small loop can't
   swallow a big background object). Shift adds, like the marquee.
5. The selection shows per-object boxes plus a shared bounding box with
   handles. Esc clears the selection.
6. Before clicking, hovering reveals the exact topmost object that Select will
   grab. The pointer becomes an open hand over an object, diagonal resize over
   a corner handle, and a closed hand while moving or rotating; empty canvas,
   a locked layer and marquee creation remain visually distinct.

## Transform

- **Move:** drag the selection (one drag = one undo).
- **Scale:** corner handles scale uniformly (aspect preserved).
- **Rotate:** the handle above the box rotates. Strokes, lines and text rotate
  **free-form**, with Shift snapping to 15°; a selection containing rectangles,
  ellipses or pixel content (images, fills) rotates in **90° steps** — those
  have no arbitrary-angle form. During the gesture, a compact readout beside
  the pointer shows the effective angle and whether it is free, 15°-snapped or
  90°-stepped. With Touch feedback on, crossing a snapped step gives one tiny
  tactile detent on supported devices.
- **Nudge:** arrow keys move the selection 1 px; Shift = 10 px.
- **Spoken position:** “move it left/right/up/down” and equivalent localized
  phrases understand “it” as the visible selection and move it by the same
  predictable 10 px step as Shift+Arrow. “Center it” places the selection at
  the canvas center. “Put it at the left/right/top/bottom edge” places the
  selection's shared bounds flush with that canvas edge. Each request is one
  undoable action; missing or locked selections receive specific guidance and
  a bare direction does nothing.
- **Spoken continuation:** immediately after a successful directional nudge,
  “again” or “a little more” repeats the same 10 px nudge. This one-turn memory
  is cleared by every other command, failed or empty listen, or unavailable
  selection. Centering, edge placement, deletion, duplication and every other
  action are never repeatable through an ambiguous “again.”
- **Spoken size:** while anything is selected, “make it bigger” or “make it
  smaller” understands “it” as the selected artwork and scales the group gently
  about its shared center. Each request is one undoable step; a locked selection
  is refused rather than silently changing the brush.
- **Spoken color:** “make it red” and equivalent localized phrases recolor a
  visible vector selection as one undoable step. A bare “red” still chooses the
  current drawing color. Missing, locked and pixel selections get specific
  guidance; raster pixels never pretend to have changed.
- **Duplicate** (Cmd/Ctrl+D), **delete** (Del/Backspace), **bring
  forward / send backward** (within the layer), **group** (Cmd/Ctrl+G) and
  **ungroup** (Cmd/Ctrl+Shift+G) — all undoable.

## Snapping

On by default; toggleable in the Design panel. While dragging, the
selection snaps — within **6 px** (at 100% zoom, scaled with zoom) — to:

- the canvas edges and canvas center lines, and
- every other object's edges and centers,

with thin accent guide lines showing what it snapped to and a compact
pointer-side confirmation while the guide is active. The closest candidate per
axis wins. With Touch feedback on, entering a new guide produces one tiny
tactile detent on supported devices; repeated movement along that same guide
stays silent.

An optional **workspace grid** adds evenly spaced Design-only lines at an exact
4–256 px interval (16 px initially). It is hidden initially and never appears
in Draw, presentations, prototypes or exports. Showing it also makes a separate
**Snap to grid** choice available; that choice starts on but has no effect while
the grid is hidden, so an invisible grid can never pull artwork. Grid snapping
uses the same screen-scaled 6 px capture distance, visible full-length guide,
pointer-side interval label and sparse tactile detent as ordinary snapping.
Moving edges or centers may meet the nearest grid line; an equally close canvas
or object alignment wins. Canvas/object snapping and grid snapping remain
independently switchable. Grid visibility, interval and snapping are workspace
session choices: they create no document change, Undo step or portable state.

## Align & distribute

With two or more objects selected, the Design panel offers: **align left /
center / right / top / middle / bottom** (to the selection's shared bounds)
and **distribute horizontally / vertically** (even gaps between objects).

## Linked color variables

A saved project color can be **linked** to a vector selection (strokes, shapes
and text) so the artwork follows the swatch's current value. The link control
sits on each project-color row and appears only in Design mode with a
recolorable selection; the swatch itself still sets the active drawing color.

- **Live propagation:** editing a linked swatch recolors every linked op on the
  next render, on the canvas, in SVG export and in MCP `render`. No operation
  payload changes while the link is live.
- **One undoable step** to link or unlink a selection. Recoloring a linked op
  (spoken or direct) clears its link — a literal recolor is not a variable edit.
- **No visual jump on severing:** unlinking, deleting a linked swatch, or
  having a stale ref after import freezes the op's last resolved color back
  into its `color` field, so the artwork never shifts when a link is broken.
- **Portable:** `colorRef` rides in `.dream` files and the MCP create tools can
  set it; stale refs resolve gracefully to the baked color.

## Groups

A group is a shared label on operations of one layer — grouped objects
select and transform as one unit. Clicking any member selects the whole
group. No nesting, no containers.

## Components

1. **Create:** save any selection as a named component. It's stored in the
   **cross-project library** (on-device, available in every project),
   relative to its own content bounds.
2. **Library panel:** live thumbnails, newest first; rename (empty names
   ignored) and delete.
3. **Insert:** the named Insert control or a double-click places an instance at
   the canvas center; either pointer or keyboard activation works. Dragging a
   thumbnail onto the canvas drops it under the cursor. Every instance lands on
   **its own new layer**. While dragging, the canvas names
   the component, highlights itself as the valid target and shows a translucent
   exact-scale preview centered at the eventual drop point; a compact thumbnail
   follows the pointer outside the canvas. The inserted instance stays selected
   for immediate refinement. Leaving or cancelling clears every preview.
4. **Instances are copies.** Editing the component never updates placed
   instances; editing an instance never touches the component. (The simple
   model — no linked masters.)

## Data plots

**Plot data…** turns a small pasted table into a line, scatter or grouped-bar
figure without introducing a spreadsheet mode.

1. Input is comma- or tab-separated text with one header row, one numeric
   horizontal-axis column, one to four numeric measured-series columns, and
   2–200 data rows. Quoted comma-separated labels and doubled quote characters
   are accepted. Blank, non-numeric, uneven or oversized data stays in the
   dialog with a plain corrective message and never changes the document.
2. The dialog starts with a valid five-line example, offers an optional figure
   title and reports the recognized row and series counts before Insert.
3. Every plot has arrow-ended axes, automatically rounded numeric ranges,
   readable tick labels, light grid lines, the first-column label on the
   horizontal axis, and a color-keyed series legend. The first series uses the
   current color; later series use consistent blue, red, green and violet
   accents so comparisons remain visible.
4. Line plots join samples in table order and mark every sample; scatter plots
   show only samples; bar plots group measured series at each horizontal value
   and always include zero on the vertical scale.
5. Insert creates one new active layer centered with breathing room on the
   canvas. Its axes, grid, labels and data marks are ordinary scalable objects
   sharing one group, so a later click selects and transforms the complete
   figure. The insert is one undoable change, exports truthfully as SVG and can
   be animated or linked like any other art.

## The Link tool (U)

App-mode's hotspot creation tool lives in Design mode — full rules in
`app-mode.md`.

## Edge cases

- Selection operates on the **active layer only**.
- Hidden or locked layers can't be selected into.
- Deleting all selected objects, then undoing, restores them with groups
  and order intact.
- Transform handles stay a constant screen size at any zoom.
- A marquee that starts on an object moves that object instead of starting
  a rubber band — click empty canvas to marquee.
- Plotting never performs statistical analysis, excludes outliers or guesses
  missing values; it visualizes exactly the accepted numeric table.
