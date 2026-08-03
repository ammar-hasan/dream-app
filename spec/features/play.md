# Play mode

**Purpose.** Turn the drawing into a game you play right on the canvas.
**Casting is the magic:** your own drawings become the game pieces. Four
templates ship: **Catch!**, **Flappy Dream**, **Maze Runner** and **Dream
Jumper**.

## Behavior (all templates)

1. Play is a workspace mode. The tool rail hides; the side panel becomes
   the cast panel. The stage letterboxes the document (94% fit) on the dark
   surround `#10131a`.
2. A run flows: **ready → countdown ("3… 2… 1…", 800 ms per beat) →
   playing → over**. A big play button starts the run.
3. Score pops float up ("+1" / "−1", 800 ms); a bad hit shakes the stage
   (320 ms). On supported hardware, a life-losing collision may add one short
   optional tactile impact synchronized with that visible result. Ordinary
   movement, scoring and a duplicate game-over event stay silent.
4. The **game-over / win card** shows the score, the project's best, a
   "New best!" tag when beaten (Catch!/Flappy/Jumper), and a big "Play again!".
5. The **best score persists per project** on the device (one shared best
   slot: Catch!, Flappy and Jumper record score; Maze Runner records the
   level reached). It does not travel with `.dream` exports.
6. Play is session-only: a project saved in Play reopens in Draw. Casting
   and settings are saved with the project but live **outside undo** — undo
   never re-casts your game.
7. Sounds: tiny procedural bleeps (no assets), **on by default in kid
   mode, off for adults**, with a mute toggle in the corner (not
   persisted). Where audio is unavailable, the game plays silently.
8. Kid mode: a gamepad button in the kid toolbar jumps straight into Play;
   big on-screen controls replace keyboard reliance; gentler defaults apply
   (per template below). Saying "play my game" (or a template name, e.g.
   "play flappy") switches over and starts a run; "stop" ends it.

## Make a game from words

The cast panel begins with a short **Describe your game** request plus the
same feature-detected dictation mic as other prompt boxes. It works fully
offline in English, Arabic, Simplified Chinese, Brazilian Portuguese and Russian and
uses only rules Dream can actually run:

1. The request chooses Catch!, Flappy Dream, Maze Runner or Dream Jumper from
   words such as catch/collect/dodge, fly/flap/gates, maze/explore/exit, or
   run/jump/platform/flag. If it does not name a kind of game, the currently
   selected template stays selected.
2. Easy/gentle, hard/challenging, fast/slow, many/few and an explicit one to
   nine lives/shields tune the same visible settings as the cast panel.
3. Mentioning an existing layer by name casts it. Familiar names help choose
   the role (`Rocket` as hero, `Clouds` as obstacle, `Stars` as good things,
   `Rocks` as bad things); other mentioned layers fill the template's roles
   in the order they appear in the request.
4. Dream shows the chosen game as ready, and the visible picker, casting rows
   and settings update immediately. The user still presses Play, so a request
   never starts an unexpected run.
5. This planner does not contact an AI provider, spend a free try or invent
   mechanics outside the four templates. Casting and settings retain their
   normal outside-undo persistence rules.
6. Dictation follows the active language and fills the request; browsers
   without speech recognition simply omit the mic without losing the typed
   path.

## Casting

Each template declares roles; every role offers a layer dropdown plus
**"Draw it now"** (creates a named layer, casts it, and lands you in Draw
mode with the brush ready). Roles left on **Auto** get a friendly built-in
stand-in drawn on the fly — no AI, no assets.

| Template     | Roles                            | Stand-ins                                                                   |
| ------------ | -------------------------------- | --------------------------------------------------------------------------- |
| Catch!       | hero, good, bad, background      | smiley hero (sky-blue face), gold star (good), grumpy gray spiky rock (bad) |
| Flappy Dream | hero, obstacle, background       | smiley hero; soft-emerald gate bar with darker rim bands                    |
| Maze Runner  | hero, background                 | smiley hero; the exit is always a pulsing gold star                         |
| Dream Jumper | hero, good, obstacle, background | smiley hero; gold collectible star; grass-topped earth platform             |

- A cast layer must exist and be **visible**; its content is cropped to its
  non-empty pixels (alpha above a whisper — 8/255 — counts as content). An
  empty, hidden or missing layer silently falls back to the stand-in.
- Sprites are re-captured from the current document at every run start —
  edit your hero, press play, your edit plays.
- **Backdrop:** if a background layer is cast, only it shows; otherwise the
  backdrop is the whole document **minus** the cast piece layers.

## Catch!

Things fall from the top; the hero slides left/right to catch the good ones
(+1) and dodge the bad ones (−1 life).

- **Hero:** width = 14% of the canvas width, clamped to 64–120 px; height
  55% of that; sits 58 px above the bottom edge. Arrow keys move it at
  **460 px/s**; touch/mouse drag positions it directly (the finger wins
  over the keys). The hero never leaves the stage.
- **Things:** 56 px squares spawning every `spawnInterval` seconds (first
  one 300 ms after "go"), anywhere across the width; **25% are bad**; each
  falls at `fallSpeed × (0.85–1.25)`.
- **Catch:** horizontal overlap with the hero's band. Good catch: **+1
  score**. Bad catch: **−1 life** and a shake. **Missing a thing costs
  nothing** — it just falls away.
- **Difficulty ramp:** fall speed grows linearly to **2× at 75 seconds**;
  spawn interval shrinks to **0.5× at 120 seconds**.
- **Game over:** lives reach 0.
- Kid mode: two big on-screen ◀ ▶ arrows.

## Flappy Dream

Tap to flap; thread the gates. (Physics tuned for a 480 px-tall stage and
scaled to the document.)

- **Hero:** at 28% of the width, size ~56 px scaled to the stage. Gravity
  **1500 px/s²**, flap impulse **−430 px/s**. The ceiling is a soft stop;
  **the floor is a hit**. The hitbox is forgiving (42% of the sprite
  radius).
- **Gates:** spawn from the right edge every `spawnInterval` seconds,
  first 700 ms after "go"; gap vertically centered in the middle 50% of
  the stage; gate width ~72 px scaled (min 48 px).
- **Score:** **+1 per gate threaded**, exactly once per gate.
- **Damage:** clipping a gate or hitting the floor costs one shield and
  grants a **1.5 s mercy window** (the hero blinks, no double jeopardy). At
  zero shields: game over. **Adult default is 1 shield — one-hit death.**
- **Difficulty ramp:** scroll speed to **1.8× at 110 s**; gap height
  tightens to **62% at 240 s**; spawn interval to **0.65× at 180 s**.
- **Controls:** tap/click, Space, ↑ or W to flap. Kid mode: a big "Flap!"
  button.

## Maze Runner

Guide the hero through a generated maze to the gold star. **No lives, no
losing** — the reward is the next, bigger maze.

- **Maze:** a perfect maze (exactly one path between any two cells),
  generated fresh per run from a seed; start top-left, exit bottom-right.
- **Sizes:** adult level 1 = **8×6 cells**, growing to at most 16×12
  (+2 columns, +1 row per level). Kid level 1 = **5×4**, growing to at most
  9×7.
- **Movement:** grid-locked gliding at **7 cells/s** (kid: 5.5). Held
  directions glide only through open passages; **walls swallow the press —
  no bump, no penalty.**
- **Controls:** arrows or WASD; swipe on touch. Kid mode: a 4-way
  on-screen arrow pad.
- **Win:** reaching the exit records your solve time (the HUD shows level
  and a running timer). The win card offers "Next maze" — a fresh maze one
  level bigger. Level reached feeds the shared best slot.
- No settings knobs — "mazes grow bigger each level" is the difficulty.

## Dream Jumper

Run and jump across a short side-scrolling course, collect stars and reach
the finish flag.

- **Course:** generated from a fresh seed each run, about 2.35 screen widths
  long. Every gap is at most 100 document pixels at the reference scale and
  each neighboring platform changes height by at most 40, keeping every
  route within the jump envelope. The first and finish platforms are broad.
- **Hero:** accelerates instantly to the chosen run speed; gravity is
  **1650 px/s²** and a jump begins at **−610 px/s**, scaled with the stage.
  Platforms are forgiving one-way surfaces: land from above, pass through
  from below, and never snag on an edge.
- **Score:** each platform star is worth **+1**, exactly once. The finish
  flag wins with the collected score and can set the project's shared best.
- **Falls:** falling below the stage spends one life, shakes gently and
  respawns at the start without restoring collected stars. Zero lives ends
  the run.
- **Controls:** ←/→ or A/D to run; Space/↑/W, click or tap to jump. Kid mode
  adds big left, jump and right buttons and starts with five lives and a
  gentler speed.

## Settings (Catch!, Flappy and Dream Jumper)

Sliders in the cast panel. Any value the user sets wins over both defaults;
until a knob is touched, kid mode gets the gentler column.

| Knob                       | Range   | Catch! adult / kid | Flappy adult / kid                  | Jumper adult / kid    |
| -------------------------- | ------- | ------------------ | ----------------------------------- | --------------------- |
| Speed (`fallSpeed`, px/s)  | 60–400  | 180 / 110          | 170 / 120 ("Flight speed")          | 230 / 170 (run speed) |
| Spawn (`spawnInterval`, s) | 0.4–2.5 | 1.1 / 1.6          | 1.35 / 1.8 ("How often gates come") | not shown             |
| Lives (`lives`)            | 1–9     | 3 / 5              | 1 / 3 ("Shields")                   | 3 / 5                 |

## Sounds (the bleep table)

Procedural tones: frequency / duration / waveform.

| Moment                               | Tone                       |
| ------------------------------------ | -------------------------- |
| run start                            | 523 Hz · 0.12 s · triangle |
| countdown beat                       | 440 Hz · 0.08 s · sine     |
| "go"                                 | 784 Hz · 0.18 s · triangle |
| good catch / Jumper star             | 880 Hz · 0.12 s · sine     |
| bad catch / Flappy hit / Jumper fall | 160 Hz · 0.25 s · sawtooth |
| game over                            | 220 Hz · 0.5 s · triangle  |
| flap / jump                          | 620 Hz · 0.07 s · square   |
| gate threaded                        | 990 Hz · 0.14 s · sine     |
| maze solved / flag reached           | 660 Hz · 0.45 s · triangle |

## Edge cases

- All keyboard shortcuts outside the game are suspended while a run is
  active — the game owns the keys.
- Switching templates keeps your cast and settings; switching away from
  Play stops the run.
- A cast layer that's deleted or hidden reverts to the stand-in on the
  next run — no error, no crash.
- Tab-switching mid-run can't teleport entities (frame time is clamped).
