# Design mode

**Purpose.** The pro workspace: treat what's on a layer as objects — select,
move, scale, rotate, align, group, and save selections as reusable
components. Draw mode stays untouched; Design mode is opt-in per project.

## Entering

The workspace switch (Draw / Design / Play / Present) moves to Design; the
choice is saved with the project. Design mode reveals the Select, Lasso and
Link tools, the Design panel, the Links panel and the Components panel.

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

## Transform

- **Move:** drag the selection (one drag = one undo).
- **Scale:** corner handles scale uniformly (aspect preserved).
- **Rotate:** the handle above the box rotates. Strokes, lines and text
  rotate **free-form**; a selection containing rectangles, ellipses or
  pixel content (images, fills) rotates in **90° steps** — those have no
  arbitrary-angle form.
- **Nudge:** arrow keys move the selection 1 px; Shift = 10 px.
- **Duplicate** (Cmd/Ctrl+D), **delete** (Del/Backspace), **bring
  forward / send backward** (within the layer), **group** (Cmd/Ctrl+G) and
  **ungroup** (Cmd/Ctrl+Shift+G) — all undoable.

## Snapping

On by default; toggleable in the Design panel. While dragging, the
selection snaps — within **6 px** (at 100% zoom, scaled with zoom) — to:

- the canvas edges and canvas center lines, and
- every other object's edges and centers,

with thin accent guide lines showing what it snapped to. The closest
candidate per axis wins.

## Align & distribute

With two or more objects selected, the Design panel offers: **align left /
center / right / top / middle / bottom** (to the selection's shared bounds)
and **distribute horizontally / vertically** (even gaps between objects).

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
3. **Insert:** double-click places an instance at the canvas center; or
   drag a thumbnail onto the canvas to drop it under the cursor. Every
   instance lands on **its own new layer**.
4. **Instances are copies.** Editing the component never updates placed
   instances; editing an instance never touches the component. (The simple
   model — no linked masters.)

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
