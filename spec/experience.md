# Experience — the complete interaction map

The shell, the modes, every shortcut, and the exact journeys. Feature
semantics live in `features/`; this file is the map of how it all fits
together on screen.

## First run

1. **Splash:** the pulsing Dream mark on the brand background while the
   last-opened document restores (fades out in ~⅓ s once ready; it lifts
   even if restore fails).
2. **Welcome card:** on a fresh canvas, a glass card with the mark says
   "**Pick a brush and start dreaming**". It dismisses on the first canvas
   interaction or the first successful story creation, so it never obscures a
   generated result, and never returns (remembered per device).
3. A brand-new user gets a 1024×768 white document with one layer, the
   brush active, color `#1f2937`, size 8.

## The shell (adult)

- **Top toolbar, left to right:** the Dream mark + "Dream" title + document
  name (a `•` while unsaved) · New, Open, Save, Import, Resize, Export ·
  the **workspace switch** (Draw / Design / Play / Present, a sliding
  pill) · Animate toggle · Story · AI sparkle · voice mic · Undo, Redo ·
  kid-mode star · settings gear. Where speech recognition is unavailable,
  the mic remains discoverable and explains the touch, mouse and keyboard
  paths instead of disappearing.
- **Left tool rail (in order):** Select*, Lasso*, Link*, Move, Brush,
  Pencil, Spray, Eraser, Line, Rectangle, Ellipse, Fill, Magic wand,
  Stamps, Color picker, Text, Crop, Pan, Zoom. (*Design mode only.) Every
  button has a styled tooltip with its name and shortcut. The same styled
  contract names panel and timeline controls. Tooltips float beyond scrolling
  toolbar, rail, panel and timeline boundaries rather than being clipped by
  them; native browser tooltip bubbles are not used.
- On an adult phone, tools move into a six-place bottom dock so the canvas gets
  the full width. The current tool remains visible beside the mode's common
  tools; **All tools** reveals the complete eligible set in a labelled grid.
  **Select** is always in the Design dock. **Controls** opens the complete
  Options, Adjust and Layers stack plus Design, Links and Components where
  applicable; tapping AI opens that same sheet directly at Dream AI. Both
  sheets close on Escape and return focus to their trigger. Little Dreamer's
  larger reading-light rail is unchanged.
- **Right panel:** tool options, plus per mode (matrix below).
- **Bottom:** the timeline bar (when frames exist) and the status bar
  (pointer x,y · document size · active tool · zoom %).
- **Floating zoom pill** at the bottom-end of the canvas: −, % (tap to
  fit), +.
- At ordinary 1280 px laptop width, spacing and brand text compact before any
  action disappears: Story, AI, voice, Undo, Redo, Little Dreamer and Settings
  all remain visible. When translated labels need more room, file and creation
  actions scroll inside their own toolbar region while recovery and Settings
  stay anchored and reachable.
- Narrow windows (under ~860 px) drop the side panel.
- On phone-width adult layouts, the bottom timeline keeps frames and their
  add/duplicate/reorder/delete actions visible while an **Animate / Slides /
  App** choice reveals only that job's controls. App offers linking before any
  links exist and preview afterward. The top shell never scrolls horizontally:
  identity, Story, AI, voice, Undo, Settings and all four workspaces stay
  visible, while a clearly named **More actions** control reveals New, Open,
  Save, Import, Resize, Export, Animate, Redo and Little Dreamer in a labelled
  two-column tray. Escape closes the tray and returns focus to its trigger.
  Little Dreamer keeps its reading-light animation controls without the job
  choice.

## Mode × audience matrix

|                    | Tool rail                          | Center                | Right panel                                             | Notes                        |
| ------------------ | ---------------------------------- | --------------------- | ------------------------------------------------------- | ---------------------------- |
| **Draw** (adult)   | full rail (no Select/Lasso/Link)   | canvas + zoom pill    | options · Adjust · Layers (+ AI panel when open)        | the default, MS-Paint-simple |
| **Design** (adult) | full rail                          | canvas + zoom pill    | Design · Links · Components · options · Adjust · Layers |                              |
| **Play** (adult)   | hidden                             | the game stage        | cast panel only                                         | shortcuts belong to the game |
| **Present**        | —                                  | full-window stage     | presenter notes panel when requested                    | slideshow/app chrome only    |
| **Draw** (kid)     | kid rail (9 tools, palette, sizes) | canvas (no zoom pill) | kid panel                                               |                              |
| **Play** (kid)     | hidden                             | the game stage        | none                                                    | big on-screen controls       |

Kid mode has no mode switch at all — Draw and Play are reached via the
gamepad button.

## Keyboard shortcuts (complete)

Typing in a text field never triggers shortcuts. While a game is running,
all keys belong to the game.

| Keys                                   | Context                      | Action                                                    |
| -------------------------------------- | ---------------------------- | --------------------------------------------------------- |
| Cmd/Ctrl+Z · Cmd/Ctrl+Shift+Z / Ctrl+Y | anywhere                     | undo · redo                                               |
| B · P · S · E                          | —                            | brush · pencil · spray · eraser                           |
| L · R · O                              | —                            | line · rectangle · ellipse                                |
| G · W · N · I · T                      | —                            | fill · magic wand · stamps · eyedropper · text            |
| C · H · Z                              | —                            | crop · pan · zoom tool                                    |
| M                                      | —                            | move tool                                                 |
| V                                      | Draw → move; Design → select | mode-aware                                                |
| K · U                                  | Design only                  | lasso · link                                              |
| A                                      | —                            | toggle the AI panel                                       |
| + / = · − / _                          | —                            | zoom in · out (the ladder)                                |
| Space (hold)                           | not timeline/present/play    | pan                                                       |
| Space                                  | timeline focused             | play/pause the animation                                  |
| Shift (while dragging)                 | shapes                       | constrain: 45° line, square, circle                       |
| Enter                                  | crop active                  | apply crop                                                |
| Esc                                    | priority order               | cancel wand → clear selection → cancel crop → cancel text |
| Cmd/Ctrl+D                             | Design, selection            | duplicate                                                 |
| Cmd/Ctrl+G · +Shift                    | Design, selection            | group · ungroup                                           |
| Del/Backspace                          | Design, selection            | delete selection                                          |
| Arrow keys                             | Design, selection            | nudge 1 px (Shift = 10 px)                                |
| Del/Backspace                          | wand region floating         | delete the region                                         |
| → ↓ Space PgDn Enter                   | Present, slideshow           | next slide                                                |
| ← ↑ PgUp                               | Present, slideshow           | previous slide                                            |
| Esc                                    | Present                      | exit to the previous workspace                            |
| (navigation keys)                      | Present, app flavor          | ignored — hotspots only                                   |
| ← →                                    | Catch! running               | move hero                                                 |
| Space / ↑ / W / tap                    | Flappy running               | flap                                                      |
| Arrows / WASD / swipe                  | Maze running                 | glide                                                     |
| ← → / A D · Space ↑ W / tap            | Dream Jumper running         | run · jump                                                |

(Tool keys do nothing while a modifier is held.)

## Voice

The complete voice-intent table — every command with English, Arabic, Persian,
Simplified Chinese, Brazilian Portuguese and Russian phrases, precedence rules and the color vocabulary — is in
`features/accessibility.md` §Voice commands.

## The journeys

### Draw → save

1. Open Dream (splash → welcome card on first run). 2. Pick a color from
   the palette; draw with the brush. 3. The document autosaves 800 ms
   after the last stroke (name gains/loses its `•`). 4. Close and reopen:
   the drawing is back.

### Draw → animate → export

1. Draw a ball. 2. Click **Animate** — the drawing becomes frame 1.
2. Duplicate the frame, drag the ball down, repeat (onion skin ghosts the
   previous frame at 30%). 4. Press play — 6 fps, looping. 5. Export →
   **WebM video** (records in real time) or **Sprite sheet** (one PNG
   grid). For video, choose Original, Vertical 9:16, Square 1:1 or Landscape
   16:9; add a caption to each frame, stepping previous/next or copying one
   message to all frames; Export saves the captions and burns them into the
   movie.

### Design → brand delivery

1. Create a logo or other client asset on the canvas.
2. Open Export and choose **Brand pack**.
3. Dream states that the one ZIP contains the source-size, 1024 px and 512 px
   long-edge PNGs and, when truthful, a scalable SVG.
4. Export downloads the complete named pack without resizing or otherwise
   changing the working document. Pixel content merely omits SVG; it never
   prevents the raster delivery.

### Tell a story → reviewed animation

1. Choose **Story** or say “make a story about…”; in Little Dreamer mode tap
   the large **Tell a story!** control. 2. Speak or type the idea. Dream shows
   two to six numbered moments without changing the canvas. 3. Edit, add,
   remove, re-plan or hear any moment aloud, then confirm **Make animation**.
2. Progress names the current picture while the chosen painter works. The
   complete captioned flipbook appears only after every picture succeeds,
   begins playing slowly, and one Undo removes the whole result.

### Frames → present

1. Select a frame and open **Slide settings**. 2. Choose how it enters,
   optionally give it a 1–60 second duration, and add speaker notes; save all
   three together. 3. Repeat only for slides that need different behavior.
2. Enter **Present**. Navigate manually, or turn on **Auto** to follow the
   per-slide timings (untimed slides pause). 5. Turn on **Presenter** to open a
   separate private console with current/next previews, notes, elapsed and
   remaining time, and synchronized controls. The audience window stays clean;
   close the console without stopping the show.

### Draw → play

1. Draw a character. 2. Switch to **Play**. 3. In the cast panel, cast
   your character's layer as the Hero (or "Draw it now" from any role).
2. Press the big play button: 3… 2… 1… — your drawing catches stars.
3. Game over shows score + best; "Play again!" reruns with your latest
   edits.

### Frames → app

1. With animation on, draw screen 1; add a frame; draw screen 2. 2. The
   timeline hints "Link your frames to make an app →". 3. With the Link
   tool, drag over the drawn button on screen 1 → "go to frame 2", fade.
2. **Preview app**: only the hotspot responds. 5. Export → **Interactive
   app (.html)** — one file that opens anywhere, offline. 6. Or Export →
   **Real code (AI) (.html)** — the same app as readable, commented code
   (AI-generated with your own provider, or locally by Dream AI).
3. For a small prototype, Export → **Share app link** → **Copy link**. Opening
   it goes straight to the viewer-only app; private project structure and
   presenter material are absent. If the visuals exceed the safe link size,
   Dream points back to the Interactive app file.

### Data → scientific figure

1. Switch to **Design** and choose **Plot data…**.
2. Paste a labeled CSV or tab-separated table, choose Line, Scatter or Bar, and
   optionally title the figure.
3. Check the recognized row/series count, then **Insert plot**.
4. Dream adds one clean grouped figure on its own layer: rounded axes, grid,
   color-keyed legend and the exact accepted values.
5. Click any plot mark to move or scale the complete plot, annotate it with
   connectors and scientific text, then export a genuinely scalable SVG. One
   Undo removes the insertion.

### BYOK setup

1. Open the AI panel (sparkle or A) → Settings. 2. Choose "My own AI",
   paste base URL + model + API key; tick "can also paint images" if it
   can. 3. **Test connection** → "It works!". 4. Save: the daily counter
   disappears; the key lives only for the session unless "remember key"
   was ticked.

## Status & feedback conventions

- Every voice command, refusal and background action reports in the
  **status area** (bottom bar) in plain words.
- Voice also has a compact conversation surface: listening is visible, the
  growing transcript shows what Dream hears, the interpreted phrase stays with
  its result, and the same localized command can be typed when recognition is
  unavailable. Results and errors are announced without moving focus.
- Every destructive or surprising action is either undoable (almost
  everything) or asks first (voice "clear").
- Tooltips show name + shortcut everywhere except kid mode.
