# Acceptance — the rebuild checklist

The proof that a rebuild is faithful. Sections A–J are numbered,
individually testable behavioral criteria (GIVEN/WHEN/THEN). Section K is
the ten end-to-end scenarios — each maps to a persona. Section L is the
visual/feel checkpoints. A rebuild passes when every applicable statement
holds.

## A. Core drawing & undo

1. GIVEN a blank document WHEN the user draws a brush stroke and presses
   undo THEN the canvas returns to blank; redo restores the stroke exactly.
2. GIVEN 201 document edits WHEN the user undoes repeatedly THEN exactly
   200 undo steps are available.
3. GIVEN a single tap with the brush THEN a visible round dot appears.
4. GIVEN the pencil or eraser WHEN opacity is 30% THEN the stroke is fully
   opaque anyway; the brush honors the 30%.
5. GIVEN a stylus stroke with varying pressure THEN stroke width varies
   smoothly along the path, never exceeding size × 1 or dropping below
   size × 0.1.
6. GIVEN an eraser stroke over artwork on a white background WHEN exported
   to PNG THEN the erased pixels are transparent (not white).
7. GIVEN a spray stroke WHEN the document is saved, reloaded and exported
   THEN the dot pattern is pixel-identical in all three.
8. GIVEN Shift held while dragging a line THEN its angle snaps to the
   nearest 45°; with rectangle/ellipse, the shape becomes a square/circle.
9. GIVEN "fill shapes" on WHEN a rectangle is dragged THEN it commits
   filled with no outline.
10. GIVEN mirror mode "quad" WHEN one stroke is drawn THEN four reflected
    strokes appear and ONE undo removes all four.
11. GIVEN a click on a flat-color region with the fill tool THEN exactly
    the contiguous same-color region fills; filling it again with the same
    color adds no undo step.
12. GIVEN the wand (tolerance 32) WHEN a pixel is clicked THEN the
    contiguous similar-colored region lifts into a floating patch; Esc
    restores the layer untouched; Delete removes the region as one
    undoable step.
13. GIVEN a stamp placed at Medium THEN its bounding box is 96 px and one
    undo removes the whole doodle.
14. GIVEN a starter scene inserted THEN it lands as a new layer of black
    outline art sized to the document, colorable with brush or fill.
15. GIVEN zoom WHEN the user steps +/− THEN zoom visits the ladder values
    (25…800%) and wheel zoom keeps the cursor point stationary.

## B. Layers, editing & images

16. GIVEN three layers WHEN the middle one is hidden THEN its content
    disappears from canvas and exports; undoing the hide restores it.
17. GIVEN a layer at 50% opacity WHEN exported THEN all its content
    renders at half alpha over what's below.
18. GIVEN a locked layer WHEN any draw/move/delete is attempted THEN
    nothing changes and the user is told why.
19. GIVEN an imported photo larger than the canvas THEN it lands centered
    on its own layer, scaled down to fit, never upscaled.
20. GIVEN the Adjust panel WHEN sliders change THEN the preview updates
    live; Cancel leaves the layer untouched; Apply bakes exactly one
    undoable change.
21. GIVEN the Vintage preset THEN the applied values equal sepia 70,
    contrast 15, brightness −5 — and the pixels match applying those
    sliders manually.
22. GIVEN a layer rotated 90° THEN it rotates around its own content
    center and stays in place.
23. GIVEN an animated document WHEN cropped THEN every frame crops and the
    whole operation is one undo step.
24. GIVEN a 1024×768 document resized to 512×384 THEN pixel content
    resamples nearest-neighbor (crisp, unblurred) and undo restores the
    exact original.

## C. Design mode

25. GIVEN two overlapping objects WHEN clicked at the overlap THEN the
    topmost selects; Shift-click adds the other.
26. GIVEN a marquee drag on empty canvas THEN every object intersecting
    the rectangle selects.
27. GIVEN a lasso loop around a small object inside a big one THEN only
    the small object selects (center-in-loop rule).
28. GIVEN a selection dragged near the canvas center THEN it snaps at
    6 px with a visible guide line; the snap toggle disables this.
29. GIVEN a selection of a stroke WHEN rotated via the top handle THEN any
    angle is possible; a selection containing an image rotates in 90°
    steps only.
30. GIVEN three objects WHEN "align left" is chosen THEN their left edges
    equal the selection's left edge; "distribute horizontally" evens the
    gaps.
31. GIVEN a grouped pair WHEN any member is clicked THEN both select and
    transform as one; ungroup restores individual selection.
32. GIVEN a saved component WHEN inserted twice and the component is then
    edited THEN the placed instances do not change; each instance sits on
    its own layer.
33. GIVEN Cmd/Ctrl+D on a selection THEN a copy appears offset from the
    original, as one undoable step.

## D. Animation & present

34. GIVEN a drawing WHEN Animate is toggled THEN the layers become frame 1
    and the timeline appears; toggling off keeps the current frame only
    (undoable).
35. GIVEN three frames WHEN the middle is deleted THEN neighbors close
    rank, the next frame becomes current, and undo restores the deleted
    frame in place.
36. GIVEN one frame WHEN delete is attempted THEN it is refused (the last
    frame always survives).
37. GIVEN frame 2 current WHEN the user undoes a stroke drawn on frame 1
    THEN frame 1's content restores without switching the user away from
    frame 2.
38. GIVEN onion skin on THEN the previous frame ghosts at 30% opacity
    (adjustable 5–80%) while drawing, and hides during playback.
39. GIVEN playback at 6 fps over 12 frames with loop off THEN the run
    lasts 2 seconds and stops on the last frame.
40. GIVEN playback running WHEN the user tries to draw THEN nothing is
    committed; pressing Space with the timeline focused pauses.
41. GIVEN a Present session THEN arrows/Space/click advance, ← goes back,
    the counter reads "n / N", Esc returns to the previous workspace, and
    a frameless document presents as "1 / 1".
42. GIVEN Present reopened later THEN it starts in Slideshow flavor (the
    app/slideshow choice is session state).

## E. Play mode

43. GIVEN a layer cast as the Catch! hero WHEN a run starts THEN the hero
    sprite is that layer's content cropped to its non-empty pixels;
    hiding the layer restores the smiley stand-in next run.
44. GIVEN Catch! defaults (adult) THEN things fall at 180 px/s, spawn
    every 1.1 s, 25% are bad, and the player has 3 lives.
45. GIVEN a good catch THEN score +1 with a "+1" pop; a bad catch costs a
    life with a shake; a missed thing costs nothing.
46. GIVEN a 75-second Catch! run THEN fall speed has doubled linearly.
47. GIVEN Flappy with 1 shield WHEN the hero clips a gate THEN the run
    ends; with 3 shields the hit costs one shield and grants 1.5 s of
    invulnerability.
48. GIVEN Maze Runner level 1 THEN the maze is 8×6 cells (5×4 kid),
    solvable, start top-left, exit bottom-right; walls never hurt.
49. GIVEN kid mode entering Play THEN sounds are on, big on-screen
    controls show, and defaults are gentler (5 lives, slower, sparser).
50. GIVEN a new best score THEN the game-over card says "New best!" and
    the best persists per project across reloads — but not into `.dream`
    exports.
51. GIVEN a run in progress WHEN the user switches workspace mode THEN
    the run stops cleanly.
52. GIVEN "play flappy" spoken WHEN Catch! was the template THEN the
    template switches, Play opens, and a run starts.

## F. App mode

53. GIVEN the Link tool WHEN a 3×3 px drag happens THEN no hotspot is
    created; a 10×10 drag opens the link dialog with the next frame
    preselected and fade chosen.
54. GIVEN a hotspot to frame 2 WHEN its target frame is deleted THEN the
    panel flags it broken and preview/export ignore it.
55. GIVEN app preview WHEN clicking outside any hotspot THEN nothing
    happens; arrows and Space do nothing.
56. GIVEN the exported HTML file WHEN opened with the network off THEN it
    shows the start screen, scales to the window, navigates on hotspot
    taps with the chosen transitions, restarts on Home, contains no
    external URLs, and displays "Made with Dream".
57. GIVEN hotspots in the exported file WHEN tabbing with a keyboard THEN
    each is focusable, labeled ("Go to screen N") and Enter-activatable.
58. GIVEN 2+ frames and no hotspots WHEN not in kid mode THEN the
    timeline shows "Link your frames to make an app →"; it vanishes once
    a hotspot exists.

## G. AI

59. GIVEN Dream AI WHEN "a starry night" is created twice at the same
    document size THEN both pictures are pixel-identical; each lands as a
    new layer named from the prompt.
60. GIVEN the Edit tab with "warmer" THEN the layer gains sepia 25,
    saturation 10, brightness 5 (plus unmentioned defaults); with
    "Selected part only" ticked, only the selection box changes.
61. GIVEN a blank canvas WHEN feedback is requested THEN it says the
    canvas is blank and encourages starting; on a flat, low-contrast
    drawing it suggests contrast with a one-click Apply that is undoable.
62. GIVEN 20 Dream AI actions in a day THEN the 21st is refused kindly
    with the BYOK path offered; the counter resets the next local
    calendar day.
63. GIVEN a BYOK provider without image support THEN Create is disabled
    with an explanation and Edit always is; feedback still works.
64. GIVEN an API key saved without "remember key" WHEN the app closes and
    reopens THEN the key is gone but URL/model remain; keys never appear
    in logs, settings blobs or error messages.
65. GIVEN "Test connection" with a bad URL THEN the error asks "is the
    URL right and the app running?" — no status codes, no jargon.

## H. Accessibility, i18n & voice

66. GIVEN kid mode turned on THEN the app is in Draw mode with the brush,
    the rail shows the 9 kid tools, the 12-color palette and 3 dot sizes,
    and both voices are on; turning it off restores the adult UI.
67. GIVEN kid mode WHEN hovering the brush THEN "Brush!" is spoken (where
    synthesis exists) and no tooltip shows.
68. GIVEN comfort mode THEN base text is 16 px, targets ≥ 44 px, and
    contrast strengthens in the current theme — composing with dark mode,
    kid mode and RTL.
69. GIVEN "um, can you please undo?" spoken THEN one undo happens and the
    status confirms "Took that back!".
70. GIVEN "clear" spoken THEN the app asks for a spoken yes before
    wiping; "no" cancels and keeps everything.
71. GIVEN the Arabic UI WHEN "تراجع" is spoken THEN undo happens; "undo"
    still works too; "شغّل التناظر" turns mirroring on and never starts
    playback.
72. GIVEN "fill red" THEN the color becomes red `#ef4444` and the fill
    tool activates.
73. GIVEN "bigger" at size 8 THEN the size becomes 12; at 64 it stays 64.
74. GIVEN Arabic selected THEN the whole shell mirrors to RTL instantly
    without reload, and every string has an Arabic value (no English
    leakage, no missing keys).

## I. Persistence, files & offline

75. GIVEN an edit WHEN 800 ms pass without further edits THEN the project
    is saved on-device and the dirty dot clears.
76. GIVEN a drawing WHEN the app is closed and reopened THEN it restores
    from the last-opened pointer after the splash.
77. GIVEN a `.dream` export imported into a fresh Dream THEN document,
    frames, hotspots and game setup are identical (opaque pixels exactly;
    vector content exactly).
78. GIVEN a `.dream` file with unknown extra fields WHEN loaded and
    re-saved THEN the unknown fields survive verbatim.
79. GIVEN a corrupt or version-2 `.dream` file WHEN opened THEN a plain
    error names the problem and nothing changes.
80. GIVEN the app loaded once WHEN the network is killed and the app
    reloaded THEN it boots and fully works offline.
81. GIVEN a new version downloaded WHEN the user hasn't pressed Refresh
    THEN the old version keeps running; pressing Refresh swaps once.
82. GIVEN the install offer dismissed THEN it never returns on that
    device.
83. GIVEN the component library WHEN a component is saved in project A
    THEN it is available in project B.

## J. Cross-cutting

84. GIVEN any document mutation WHEN undone and redone THEN the result is
    bit-identical to never having undone.
85. GIVEN undo history WHEN the user changes workspace mode, fps, onion
    settings, game casting or the active frame THEN none of those appear
    as undo steps — but frame add/duplicate/delete/reorder do.
86. GIVEN a project saved in Play or Present mode WHEN reopened THEN it
    opens in Draw.
87. GIVEN a hidden feature (no speech recognition, no audio, no
    recorder) THEN its button simply isn't there — never an error.
88. GIVEN reduced-motion OS preference THEN every animation and
    transition in the app and its exports is effectively instant.
89. GIVEN the dark theme THEN every surface, panel, dialog and tooltip
    uses the dark tokens; the choice persists.
90. GIVEN any list of projects or components THEN it sorts by
    last-modified, newest first.

## K. The ten end-to-end scenarios (persona proofs)

1. **Zainab (5):** kid mode on → tap the purple swatch → draw → say
   "تراجع" (or "oops") → it undoes → stamp a rocket → say "play my game"
   → the rocket catches stars.
2. **Victor (85):** comfort mode on → everything bigger and calmer →
   draw → undo → save → reopen tomorrow: the drawing is there.
3. **Ali (30):** stylus pressure strokes → layers → import a photo →
   Vintage preset → crop → export JPEG q92.
4. **Fatima (21):** Arabic UI → full RTL → draw calligraphy with mirror
   symmetry on → one undo removes the whole bloom.
5. **George (45):** voice only: "brush" → "red" → "bigger" → draw → "new
   frame" → draw → "play" → "save".
6. **Sara (15):** Design mode → draw logo elements → align/distribute →
   save as component → new project → insert the component → export PNG.
7. **Zǐxuān (28):** 12-frame bouncing ball (duplicate + onion skin) →
   play at 6 fps → export WebM and a sprite sheet.
8. **Maria (32):** export `.dream` → agent reads it, adds text, renders a
   PNG, exports the app HTML via the dream-mcp tools → re-import the
   `.dream` unchanged elsewhere.
9. **Aleksandr (25):** keyboard-only: tool keys, marquee, snap-align,
   Cmd+D, nudge, group — a full layout without touching the mouse.
10. **Ahmed (42):** draw a scene per frame → Present slideshow → app
    flavor with linked frames → export the standalone HTML → it opens
    offline on a friend's phone.

## L. Visual & feel checkpoints

- The mark: gradient squircle, white crescent, white four-point sparkle —
  at 28/56/84 px.
- The signature gradient (indigo → violet → rose, 135°) on the title and
  primary buttons; calm neutral surfaces; the canvas sits on a darker
  surround so artwork pops.
- Dialogs fade-and-scale in; the mode pill slides; ambient drift behind
  the canvas; splash pulse — all transform/opacity-only, all gone under
  reduced-motion.
- Focus rings always visible; tooltips styled with name + shortcut (never
  in kid mode); touch targets ≥ 44 px in comfort mode.
- Dark theme: every token remapped, nothing hardcoded; tooltip inverts.
- Status bar reads pointer position, document size, active tool, zoom —
  tabular figures.
- The game stage and presentations letterbox on `#10131a` at 94% fit.
- It should feel like MS Paint's first minute and Photoshop's tenth year —
  and a child should smile at the bleeps.
