# Visual identity

The brand and design system as product requirements. A rebuild that matches
these values looks like Dream; everything else is free to differ.

## The mark

The Dream mark, described geometrically (redrawable in any tool):

- A **rounded square** (corner radius ~28% of its size) filled with the
  signature gradient: **135°, `#6d7cff` → `#a855f7` (at 55%) → `#f472b6`**.
- A **white crescent moon** (95% opacity) in the lower-left half, horns
  opening up-right: a circle of radius ~23% of the size, bitten by a
  slightly larger offset circle.
- A **white four-point sparkle** (90% opacity, concave sides, ~15% of the
  size) floating upper-right of the moon.
- Usage sizes: 28 px in the toolbar, 56 px on the welcome card, 84 px on
  the splash. The toolbar title "Dream" carries the gradient as its text
  color.

## Color system

All colors are named tokens; no hardcoded colors outside the token set
(the single documented exception: canvas chrome like selection guides uses
the light accent for legibility).

### Light theme

| Token                  | Value                                    | Use                               |
| ---------------------- | ---------------------------------------- | --------------------------------- |
| accent / accent-strong | `#6d7cff` / `#5a68e8`                    | primary actions, selection, focus |
| accent text            | `#4f5ed6`                                | readable accent-colored labels    |
| accent control         | `#4f5ed6`                                | solid controls with white labels  |
| accent-2 / accent-3    | `#a855f7` / `#f472b6`                    | gradient partners                 |
| signature gradient     | 135°, accent → accent-2 (55%) → accent-3 | the mark, primary buttons, title  |
| accent-soft            | `#eceefe`                                | accent-tinted fills               |
| app background         | `#eef0f6`                                |                                   |
| canvas surround        | `#d9deeb`                                | lets artwork pop                  |
| panel / panel-hover    | `#ffffff` / `#f1f3f7`                    |                                   |
| glass                  | white at 92%                             | floating pills, cards             |
| border                 | `#e2e5ee`                                |                                   |
| text / text-dim        | `#232838` / `#60687c`                    |                                   |
| danger / danger-soft   | `#dc2626` / `#fef2f2`                    |                                   |
| success / success-soft | `#15803d` / `#ecfdf3`                    |                                   |
| scrim                  | slate at 35%                             | dialog backdrop                   |
| tooltip                | bg `#232838`, text `#f4f6fb`             |                                   |
| ambient blobs          | accent at 14%, pink at 10%               | the drift behind the canvas       |

### Dark theme (only the remapped tokens)

accent `#8b93ff`, accent-strong `#7780ff`, accent-text `#8b93ff`, accent-control `#4f5ed6`,
accent-soft `rgba(139,147,255,0.16)`,
background `#14161f`, canvas surround `#0e1018`, panel `#1d202c`,
panel-hover `#282c3b`, glass `rgba(29,32,44,0.92)`, border `#303549`,
text `#e9ebf4`, text-dim `#9aa1b8`, danger `#f87171` (soft 12% tint),
success `#4ade80` (soft 12% tint), scrim `rgba(4,6,12,0.55)`, tooltip
inverted (bg `#e9ebf4`, text `#1d202c`), shadows black-based. The gradient
keeps its stops (its first stop follows the remapped accent).

Theme follows the OS until the user picks; the choice persists per user.
The browser chrome color follows the theme (`#eef0f6` / `#14161f`).

### Comfort mode overrides

Text `#0f141f` / `#ffffff`, dim text `#454d61` / `#ccd4e8`, borders
`#bfc7d8` / `#525b78` (light / dark). Base text 16 px; touch targets
≥ 44 px.

### Fixed product colors (not themed)

- Game & presentation stage surround: `#10131a`.
- Stand-in game pieces: hero sky-blue `#38bdf8`, star gold `#facc15`,
  rock gray `#6b7280`, gate emerald `#34d399`/`#10b981`.
- Hotspot/selection accent in previews: the accent color at 10–18% fill,
  65–75% dashed stroke.

## Typography

- Family: the system UI sans throughout — no custom fonts.
- Scale: app title 18 px/700 (24 px kid) · dialog titles 18 px · body
  14 px (16 px comfort/kid) · panel titles 12 px/700 uppercase,
  letter-spacing 0.08em · status bar and labels 12 px · rail labels 10 px.
- Numeric readouts (status bar, zoom, fps, counters) use tabular figures.

## Shape & depth

- Radius scale: **8 / 12 / 16 px**; pills fully round (kid mode rounds up:
  18–22 px; swatches are circles).
- Elevation: three levels — a whisper (`0 1px 2px`, 6–7% slate), a card
  (plus `0 4px 16px`, 6%), a dialog (plus `0 16px 48px`, 16%); dark theme
  deepens to black-based shadows. Primary buttons add a soft accent glow.
- Focus ring: 2 px accent outline, 2 px offset — always visible on
  keyboard focus.
- Layout constants: side panel 280 px; dialogs max 480 px wide with 24 px
  padding; toolbar padding 8×16 px. At desktop widths the side panel and all
  of its form controls remain inside the viewport; when the toolbar needs more
  room, only its file/creation region scrolls horizontally while recovery and
  Settings stay anchored — the canvas and panel never create page-level
  horizontal overflow. At phone width, the shell becomes two stable rows: a
  compact icon row for the highest-frequency creation and recovery intents,
  then a full-width four-workspace switch. Secondary actions open in a
  viewport-contained two-column tray; the toolbar itself never scrolls or
  overlaps the canvas. Adult creation tools form a labelled six-place bottom
  dock: four current/common tools, Controls and All tools. The full tool grid
  rises from the dock; the editing-control sheet floats above a calm scrim.
  Both enter with a brief transform/opacity response and keep the artwork
  visible as context rather than permanently consuming canvas width.

## Motion principles

1. **Entrance and ambient motion is transform/opacity-only.** Dialogs
   fade-and-scale in (0.24 s, slight overshoot), popovers 0.18 s, the
   welcome card 0.5 s; the workspace pill slides (0.22 s, springy); ambient
   blobs drift slowly behind the canvas (26 s loop); the splash mark
   pulses (1.4 s).
2. **Nothing ever animates layout, width or position of content**; motion
   is feedback, never decoration that delays work.
3. **Reduced-motion is absolute:** under the OS reduced-motion preference,
   all animation and transition durations collapse to effectively zero —
   including presentation/app transitions, which become instant.
4. Micro-feedback: buttons press to 97% scale, swatches lift to 112% on
   hover, score pops float and fade (800 ms), bad hits shake (320 ms).
5. Presentation and exported-app transitions: 220–250 ms, fade or
   horizontal slide (±4% / full-width respectively).
6. Adult tooltips reveal after a short hover or keyboard focus, use the
   tooltip color tokens, and remain fully visible beyond any scrolling toolbar,
   rail or panel boundary. Little Dreamer uses spoken names instead.
7. Canvas pointers predict the active result: open/closed hands for movable
   content, diagonal resize at corner handles, text for type, zoom-in/out for
   zoom, and refusal where the active layer cannot change. Hover chrome is a
   lighter preview of the same accent selection box that appears after click.
8. A drag entering the canvas gets immediate valid/invalid target emphasis and
   a short result label. The feedback disappears on leave or drop and never
   relies on color alone.
9. On supported hardware, a short tactile cue may reinforce the first named
   valid drop target and a distinct double cue may reinforce refusal. Tactile
   feedback is optional, never runs continuously while drawing, never replaces
   the visible state, and stays silent when reduced motion is requested.
10. Voice listening uses a compact five-bar waveform only while the microphone
    is active. The bars scale rather than changing layout; the accompanying
    state label and live transcript carry the meaning, so motion and sound are
    never the sole signal. The conversation card enters like other popovers and
    becomes instant under reduced motion.
11. A voice clarification presents its finite answers as compact labelled
    buttons with redundant directional arrows. The buttons use the ordinary
    focus, hover and comfort-target language; no animation or color alone
    communicates the choice.
12. A one-time contextual invitation uses the glass-card language at the top
    center of the canvas, outside the new mark. One selection glyph, one short
    question and two plain actions are the complete hierarchy. Phone actions
    are at least 44 px. Its brief transform/opacity entrance becomes effectively
    instant under reduced motion, and a tactile cue never replaces the visible
    selected state.

## Video captions

Viewer-facing frame captions sit in the lower safe area of shaped videos,
centered over a softly rounded dark translucent backing. They use high-contrast
white text, wrap to at most three lines, stay inside generous side margins and
never move, crop or stretch the artwork beneath them.

## Tone of voice

- **Warm, plain, encouraging, jargon-free** — written for children and
  grandparents. Short sentences. Exclamation where joy is earned.
- Errors say what happened and what to do: "Could not reach … — is the URL
  right and the app running?", "The microphone is off — allow it in your
  browser to talk to me."
- Confirmations celebrate lightly: "Ta-da! Your picture is on a brand-new
  layer.", "Took that back!", "All clear!", "Honestly? This is looking
  lovely. Keep going!"
- Arabic carries the same friendly register (تراجع!، تمام!، أحسنت), never
  stiff formal translation. Persian is concise, conversational Iranian
  Persian. Simplified Chinese uses concise, natural Mainland wording rather
  than English-shaped sentences. Brazilian Portuguese is conversational and
  uses familiar Brazilian product language. Russian uses concise, familiar
  product and design language. All strings in every locale follow the parity rule
  (`features/internationalization.md`).
