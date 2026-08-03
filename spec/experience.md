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
   interaction and never returns (remembered per device).
3. A brand-new user gets a 1024×768 white document with one layer, the
   brush active, color `#1f2937`, size 8.

## The shell (adult)

- **Top toolbar, left to right:** the Dream mark + "Dream" title + document
  name (a `•` while unsaved) · New, Open, Save, Import, Resize, Export ·
  the **workspace switch** (Draw / Design / Play / Present, a sliding
  pill) · Animate toggle · AI sparkle · voice mic (only where speech
  recognition exists) · Undo, Redo · kid-mode star · settings gear.
- **Left tool rail (in order):** Select*, Lasso*, Link*, Move, Brush,
  Pencil, Spray, Eraser, Line, Rectangle, Ellipse, Fill, Magic wand,
  Stamps, Color picker, Text, Crop, Pan, Zoom. (*Design mode only.) Every
  button has a styled tooltip with its name and shortcut.
- **Right panel:** tool options, plus per mode (matrix below).
- **Bottom:** the timeline bar (when frames exist) and the status bar
  (pointer x,y · document size · active tool · zoom %).
- **Floating zoom pill** at the bottom-end of the canvas: −, % (tap to
  fit), +.
- Narrow windows (under ~860 px) drop the side panel.

## Mode × audience matrix

| | Tool rail | Center | Right panel | Notes |
|---|---|---|---|---|
| **Draw** (adult) | full rail (no Select/Lasso/Link) | canvas + zoom pill | options · Adjust · Layers (+ AI panel when open) | the default, MS-Paint-simple |
| **Design** (adult) | full rail | canvas + zoom pill | Design · Links · Components · options · Adjust · Layers | |
| **Play** (adult) | hidden | the game stage | cast panel only | shortcuts belong to the game |
| **Present** | — | full-window stage | — | slideshow/app chrome only |
| **Draw** (kid) | kid rail (9 tools, palette, sizes) | canvas (no zoom pill) | kid panel | |
| **Play** (kid) | hidden | the game stage | none | big on-screen controls |

Kid mode has no mode switch at all — Draw and Play are reached via the
gamepad button.

## Keyboard shortcuts (complete)

Typing in a text field never triggers shortcuts. While a game is running,
all keys belong to the game.

| Keys | Context | Action |
|---|---|---|
| Cmd/Ctrl+Z · Cmd/Ctrl+Shift+Z / Ctrl+Y | anywhere | undo · redo |
| B · P · S · E | — | brush · pencil · spray · eraser |
| L · R · O | — | line · rectangle · ellipse |
| G · W · N · I · T | — | fill · magic wand · stamps · eyedropper · text |
| C · H · Z | — | crop · pan · zoom tool |
| M | — | move tool |
| V | Draw → move; Design → select | mode-aware |
| K · U | Design only | lasso · link |
| A | — | toggle the AI panel |
| + / = · − / _ | — | zoom in · out (the ladder) |
| Space (hold) | not timeline/present/play | pan |
| Space | timeline focused | play/pause the animation |
| Shift (while dragging) | shapes | constrain: 45° line, square, circle |
| Enter | crop active | apply crop |
| Esc | priority order | cancel wand → clear selection → cancel crop → cancel text |
| Cmd/Ctrl+D | Design, selection | duplicate |
| Cmd/Ctrl+G · +Shift | Design, selection | group · ungroup |
| Del/Backspace | Design, selection | delete selection |
| Arrow keys | Design, selection | nudge 1 px (Shift = 10 px) |
| Del/Backspace | wand region floating | delete the region |
| → ↓ Space PgDn Enter | Present, slideshow | next slide |
| ← ↑ PgUp | Present, slideshow | previous slide |
| Esc | Present | exit to the previous workspace |
| (navigation keys) | Present, app flavor | ignored — hotspots only |
| ← → | Catch! running | move hero |
| Space / ↑ / W / tap | Flappy running | flap |
| Arrows / WASD / swipe | Maze running | glide |

(Tool keys do nothing while a modifier is held.)

## Voice

The complete voice-intent table — every command with English and Arabic
phrases, precedence rules and the color vocabulary — is in
`features/accessibility.md` §Voice commands.

## The journeys

### Draw → save

1. Open Dream (splash → welcome card on first run). 2. Pick a color from
   the palette; draw with the brush. 3. The document autosaves 800 ms
   after the last stroke (name gains/loses its `•`). 4. Close and reopen:
   the drawing is back.

### Draw → animate → export

1. Draw a ball. 2. Click **Animate** — the drawing becomes frame 1.
3. Duplicate the frame, drag the ball down, repeat (onion skin ghosts the
   previous frame at 30%). 4. Press play — 6 fps, looping. 5. Export →
   **WebM video** (records in real time) or **Sprite sheet** (one PNG
   grid).

### Draw → play

1. Draw a character. 2. Switch to **Play**. 3. In the cast panel, cast
   your character's layer as the Hero (or "Draw it now" from any role).
4. Press the big play button: 3… 2… 1… — your drawing catches stars.
5. Game over shows score + best; "Play again!" reruns with your latest
   edits.

### Frames → app

1. With animation on, draw screen 1; add a frame; draw screen 2. 2. The
   timeline hints "Link your frames to make an app →". 3. With the Link
   tool, drag over the drawn button on screen 1 → "go to frame 2", fade.
4. **Preview app**: only the hotspot responds. 5. Export → **Interactive
   app (.html)** — one file that opens anywhere, offline.

### BYOK setup

1. Open the AI panel (sparkle or A) → Settings. 2. Choose "My own AI",
   paste base URL + model + API key; tick "can also paint images" if it
   can. 3. **Test connection** → "It works!". 4. Save: the daily counter
   disappears; the key lives only for the session unless "remember key"
   was ticked.

## Status & feedback conventions

- Every voice command, refusal and background action reports in the
  **status area** (bottom bar) in plain words.
- Every destructive or surprising action is either undoable (almost
  everything) or asks first (voice "clear").
- Tooltips show name + shortcut everywhere except kid mode.
