# Accessibility — kid mode, comfort mode, voice

**Purpose.** A 5-year-old and a 95-year-old should both create — literacy
optional. Three pillars: **Little Dreamer (kid) mode**, **comfort mode**,
and **voice** (spoken names + hands-free commands), all consolidated in the
settings gear.

## Little Dreamer (kid) mode

Toggle: the ⭐ in the toolbar or the settings gear. Per-user preference,
never per document.

**Turning it on** switches to Draw mode, ensures a visible tool is active
(brush), and turns both voices on (spoken tool names + voice feedback).
**Turning it off** restores the full adult UI untouched (voices off).

### What's in kid mode

- **The rail:** giant icon-only buttons (76×68 px) for nine essentials, in
  this order: **brush, pencil, eraser, fill, stamps, line, rectangle,
  ellipse, eyedropper**.
- **The palette:** a 12-color bright named palette as big round swatches
  (2-column grid): red `#ef4444`, orange `#f97316`, yellow `#facc15`,
  green `#22c55e`, teal `#14b8a6`, sky blue `#38bdf8`, blue `#3b82f6`,
  purple `#a855f7`, pink `#ec4899`, brown `#92400e`, black `#1f2937`,
  white `#ffffff`.
- **Brush sizes:** three sizes shown as dots — **Small 6 px, Medium 16 px,
  Big 32 px**.
- **The kid panel:** big Undo!/Redo! buttons; a Play!/Stop! button when
  frames exist; "Ask Dream!" (the AI Create box with a giant mic); the
  stamp picker as a giant grid (with "Start with a picture" scenes) when
  the stamp tool is active.
- **The kid toolbar:** the Dream mark, Undo/Redo, the mic, "Play my game!"
  (gamepad, jumps into Play mode), "Ask Dream!", the star and the gear. No
  file buttons, no mode switch, no document name.
- **The kid timeline** (when frames exist): a big friendly mic — "Tell the
  story!" — that records her voice over the playing animation; "All done!"
  saves the take (see `animation.md` §Voice narration).
- **No reading-required dialogs**, no tooltips (spoken names do that job),
  no zoom pill. Everything is bigger: 16 px base text, rounder corners.
- **Play mode in kid mode:** big on-screen controls (◀ ▶ for Catch!, a
  "Flap!" button, a 4-way maze pad), sounds on by default, gentler game
  defaults (see `play.md`).

## Comfort mode

A senior-friendly settings toggle (per-user; composes with dark theme, kid
mode and RTL):

- Body text 14 → **16 px**; panel titles, labels and hints grow
  accordingly.
- **Touch targets ≥ 44 px** everywhere (buttons, icon buttons, zoom pill);
  the rail, toolbar and panels get roomier padding.
- **Stronger contrast** in both themes: text `#0f141f` (light) / `#ffffff`
  (dark), dim text `#454d61` / `#ccd4e8`, borders `#bfc7d8` / `#525b78`.

## Spoken tool names

Hovering, focusing or touching a tool, color, size or stamp button says its
name aloud ("Brush!") in the current UI language. **On by default in kid
mode**, toggleable for everyone in settings. Silent where speech synthesis
is unsupported. One voice at a time (a new utterance replaces the old).

## Voice commands

The mic button in the toolbar: click, speak, done. The button **hides
where speech recognition is unsupported**; mic-permission denial gets a
friendly message. Recognition listens in the UI language. Every command
confirms in the status area and — when **voice feedback** is on (default in
kid mode) — out loud.

The parser is forgiving: case-insensitive, ignores filler ("um, can you
please undo?"), and **normalizes Arabic** (diacritics and tatweel stripped,
alef forms unified). **English commands always work**, even under the
Arabic UI (the Arabic vocabulary merges in). Unknown input gets "Sorry, I
didn't understand. Say 'help'…" and changes nothing.

### The complete intent table

| Intent           | English examples                                                                                                                                       | Arabic examples                                                                  | What it does                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| undo             | "undo", "oops"                                                                                                                                         | تراجع، رجوع                                                                      | one undo step; "Nothing to undo." when empty                                                     |
| redo             | "redo"                                                                                                                                                 | إعادة، أعد                                                                       | one redo step                                                                                    |
| clear            | "clear", "erase everything", "start over"                                                                                                              | امسح، نظف                                                                        | asks "Clear this layer? Say yes…" — spoken yes confirms ("All clear!"), anything else cancels    |
| new frame        | "new frame", "add frame"                                                                                                                               | إطار جديد، فريم جديد                                                             | enables animation if needed, adds a frame                                                        |
| play / stop      | "play", "animate" / "stop", "pause"                                                                                                                    | شغّل / أوقف                                                                      | plays the animation (needs frames) / stops playback and any game                                 |
| play my game     | "play my game", "play flappy", "play maze", "play catch"                                                                                               | العب لعبتي، المتاهة، الطيران                                                     | switches to Play (optionally switching template) and starts a run                                |
| preview my app   | "preview my app", "test the app"                                                                                                                       | عاين التطبيق                                                                     | opens the app preview (needs frames)                                                             |
| export my app    | "export my app", "share the app"                                                                                                                       | صدّر التطبيق                                                                     | downloads the standalone HTML app                                                                |
| export real code | "export real code", "make it real"                                                                                                                     | صدّر كود حقيقي                                                                   | downloads the AI-generated real-code app (needs frames)                                          |
| narration        | "record narration" / "stop recording" / "delete narration"                                                                                             | سجّل صوتي / أوقف التسجيل / امسح الصوت                                            | records a voice take over the playing animation (needs frames) / stops and saves it / deletes it |
| tools            | "brush", "pencil", "spray", "eraser", "fill", "wand", "lasso", "stamp", "line", "rectangle"/"square", "ellipse"/"circle", "eyedropper", "text", "move" | فرشاة، قلم، رش، ممحاة، دلو، عصا سحرية، لاسو، طابع، خط، مستطيل، بيضاوي، قطارة، نص | activates the tool                                                                               |
| colors           | "red", "blue", … the 22-word vocabulary below                                                                                                          | أحمر، أزرق، …                                                                    | sets the current color                                                                           |
| fill + color     | "fill red"                                                                                                                                             | —                                                                                | sets the color AND activates the fill tool                                                       |
| mirror on/off    | "mirror on", "mirror off", "symmetry on"                                                                                                               | شغّل التناظر، أطفئ التناظر                                                       | vertical symmetry on / off (mirror phrases never trigger "play")                                 |
| bigger / smaller | "bigger", "thicker" / "smaller", "thinner"                                                                                                             | أكبر / أصغر                                                                      | brush size ×~1.5 or ÷~1.5 (min 1, max 64)                                                        |
| save             | "save"                                                                                                                                                 | احفظ                                                                             | saves now                                                                                        |
| help             | "help", "commands"                                                                                                                                     | مساعدة، أوامر                                                                    | speaks the full command list                                                                     |
| confirm / cancel | "yes", "yeah" / "no", "cancel"                                                                                                                         | نعم / لا، ألغِ                                                                   | answers the clear confirmation (only as ≤2-word utterances)                                      |

### The color vocabulary (22 words)

red `#ef4444`, orange `#f97316`, yellow `#facc15`, green `#22c55e`,
teal `#14b8a6`, sky `#38bdf8`, blue `#3b82f6`, purple/violet `#a855f7`,
pink `#ec4899`, brown `#92400e`, black `#1f2937`, white `#ffffff`,
gray/grey `#6b7280`, cyan `#06b6d4`, magenta `#d946ef`, gold `#eab308`,
lime `#84cc16`, navy `#1e3a8a`, peach `#fdba74`, lavender `#c4b5fd`.
Arabic: أحمر، برتقالي، أصفر، أخضر، فيروزي، سماوي، أزرق، بنفسجي،
وردي/زهري، بني، أسود، أبيض، رمادي، ذهبي.

### Precedence rules (the parser's decision order)

1. Confirmation answers (yes/no) — only for very short utterances.
2. Help, undo, redo, then **narration phrases** — they contain stop and
   clear words ("stop recording" isn't stop; «امسح الصوت» isn't clear) —
   then clear, new frame.
3. **Mirror phrases before play words** — "شغّل التناظر" turns mirroring
   on, it never starts playback.
4. App preview/export, the make-real code export, stop, game intents,
   play, save.
5. Bigger/smaller, bare "mirror" (→ on), "fill + color", tool words,
   color words. Anything unmatched → no-op with the kind fallback message.

## The settings gear

One menu consolidates it all: Little Dreamer mode, Speak tool names, Voice
feedback, Dark mode, Comfort mode, Language, and — when the browser offers
it — Install Dream.

## Edge cases

- Voice command on a locked/empty context degrades kindly ("This layer is
  already empty.", "Nothing to play yet — add some frames first.").
- "Bigger" at size 64 stays 64; "smaller" at 1 stays 1 — and says so.
- A pending "clear?" confirmation is cancelled by any non-yes utterance,
  which is then interpreted as a new command.
- Spoken names never fire where synthesis is missing — the UI simply
  stays silent rather than erroring.
