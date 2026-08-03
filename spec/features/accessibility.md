# Accessibility — kid mode, comfort mode, voice

**Purpose.** A 5-year-old and a 95-year-old should both create — literacy
optional. Three pillars: **Little Dreamer (kid) mode**, **comfort mode**,
and **voice** (spoken names + hands-free commands), all consolidated in the
settings gear.

Across every mode and dialog, normal-sized text and interactive labels meet
WCAG AA color contrast in both themes. Brand accent fills may stay bright;
accent-colored text and solid controls use their darker readable variants.

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
  frames exist; an always-visible "Tell a story!" journey with a giant mic,
  automatic planning after dictation, read-aloud moments and spoken action
  names; "Ask Dream!" (the AI Create box with a giant mic); the
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
- At phone width, primary creation/recovery controls and every action in the
  disclosed More tray remain at least 44 px in comfort mode. The shell does not
  require horizontal scrolling, and the four named workspaces stay visible for
  orientation.
- The adult phone tool dock never scrolls horizontally. Its current and common
  tools, Controls and All tools are named buttons; disclosed tools and editing
  panels have visible headings. Escape closes either sheet and returns focus to
  the button that opened it. All dock targets remain at least 44 px in comfort
  mode, and the complete path mirrors logically in RTL.

## Spoken tool names

Hovering, focusing or touching a tool, color, size or stamp button says its
name aloud ("Brush!") in the current UI language. **On by default in kid
mode**, toggleable for everyone in settings. Silent where speech synthesis
is unsupported. One voice at a time (a new utterance replaces the old).

## Voice commands

The mic button opens one compact conversation surface. Where recognition is
available, it shows an unmistakable listening state and writes the growing
transcript onscreen, then keeps the heard phrase beside Dream's result so a
person can verify the interpretation. Speak again is direct; Stop finishes the
current phrase. Where recognition is unavailable, permission is denied or
nothing is heard, the same surface stays useful: it names the problem in the UI
language and accepts a typed command through the identical intent path. The
surface gives short examples, remains inside a phone viewport and closes on an
outside press. Escape closes it and returns focus to the mic. Opening the
reviewed story journey dismisses it so only one conversation asks for
attention.

Recognition listens in the UI language. Every command confirms in a
programmatically announced status and — when **voice feedback** is on (default
in kid mode) — out loud. The mic remains visible when recognition is
unsupported; no browser can turn it into a silent dead control. Its tooltip
stays a compact action label while closed and yields to the conversation once
opened; the full capability explanation belongs inside that surface, where it
can wrap and be announced.

The parser is forgiving: case-insensitive, ignores filler ("um, can you
please undo?"), **normalizes Arabic** (diacritics and tatweel stripped,
alef forms unified), and normalizes Arabic-keyboard yeh/kaf variants in
Persian. Simplified Chinese matches complete terms inside naturally unspaced
Mandarin utterances. Russian recognizes common case forms used with colors and
game lives. **English commands always work** under every additional
language because each locale vocabulary merges into the English base. Unknown
input gets a kind local-language fallback and changes nothing.

An answer word is treated as confirmation or cancellation only when every
meaningful word in the utterance is an answer (for example, “yeah sure”). In a
correction such as “no, undo that” or “yes, make it red,” the answer word does
not swallow the requested action; Dream follows Undo or the color request.

Voice uses visible selection as conversational context. With artwork selected,
“make it bigger” and “make it smaller” scale that artwork about its shared
center; “move it left/right/up/down” nudges it by 10 px; “center it” puts it at
the canvas center; “put it at the left/right/top/bottom edge” places its shared
bounds flush with that canvas edge; “make it red” recolors selected vector
artwork; “delete it” removes only that artwork; and “duplicate it” makes and
selects an offset copy. Every action is undoable and says what changed. A bare
color still changes the drawing color, while a referential color request
requires an editable vector selection. Missing, locked and pixel selections get
specific guidance; Dream never claims that unchanged pixels were recolored or
silently changes a hidden setting. Bare directions do not guess at an object or
change the document.
With editable artwork selected, an incomplete “move it” request starts one
bounded clarification: Dream asks whether to move left, right, up or down and
changes nothing yet. The four directions remain visible as labelled choices,
and the next one-word spoken or typed direction performs the same 10 px nudge
as a complete request. An unrecognized answer repeats the question; Cancel
cancels it; any other understood command replaces it. Closing the conversation
also forgets it. Missing or locked selections receive their ordinary guidance
instead of an impossible question. A resolved direction becomes the most recent
nudge, so the immediately following “again” remains predictable.
Immediately after a successful directional nudge, “again” or “a little more”
repeats that same 10 px nudge. The memory lasts for one voice turn only. Any
other command, failed or empty listen, missing or locked selection, centering or
edge placement clears it. Ambiguous repetition can never repeat deletion,
duplication, clearing, export or another non-nudge action.

### The complete intent table

| Intent            | English examples                                                                                                                                       | Arabic examples                                                                  | What it does                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| undo              | "undo", "oops"                                                                                                                                         | تراجع، رجوع                                                                      | one undo step; "Nothing to undo." when empty                                                     |
| redo              | "redo"                                                                                                                                                 | إعادة، أعد                                                                       | one redo step                                                                                    |
| clear             | "clear", "erase everything", "start over"                                                                                                              | امسح، نظف                                                                        | asks "Clear this layer? Say yes…" — spoken yes confirms ("All clear!"), anything else cancels    |
| new frame         | "new frame", "add frame"                                                                                                                               | إطار جديد، فريم جديد                                                             | enables animation if needed, adds a frame                                                        |
| make a story      | "make a story about…", "make an animation with…"                                                                                                       | اصنع لي قصة عن…                                                                  | opens a locally planned, editable storyboard prefilled from the rest of the spoken request       |
| play / stop       | "play", "animate" / "stop", "pause"                                                                                                                    | شغّل / أوقف                                                                      | plays the animation (needs frames) / stops playback and any game                                 |
| play my game      | "play my game", "play flappy", "play maze", "play catch"                                                                                               | العب لعبتي، المتاهة، الطيران                                                     | switches to Play (optionally switching template) and starts a run                                |
| preview my app    | "preview my app", "test the app"                                                                                                                       | عاين التطبيق                                                                     | opens the app preview (needs frames)                                                             |
| export my app     | "export my app", "share the app"                                                                                                                       | صدّر التطبيق                                                                     | downloads the standalone HTML app                                                                |
| export real code  | "export real code", "make it real"                                                                                                                     | صدّر كود حقيقي                                                                   | downloads the AI-generated real-code app (needs frames)                                          |
| narration         | "record narration" / "stop recording" / "delete narration"                                                                                             | سجّل صوتي / أوقف التسجيل / امسح الصوت                                            | records a voice take over the playing animation (needs frames) / stops and saves it / deletes it |
| tools             | "brush", "pencil", "spray", "eraser", "fill", "wand", "lasso", "stamp", "line", "rectangle"/"square", "ellipse"/"circle", "eyedropper", "text", "move" | فرشاة، قلم، رش، ممحاة، دلو، عصا سحرية، لاسو، طابع، خط، مستطيل، بيضاوي، قطارة، نص | activates the tool                                                                               |
| colors            | "red", "blue", … / "make it red"                                                                                                                       | أحمر، أزرق، … / اجعل هذا أحمر                                                    | bare color sets the current color; a referential color recolors selected vector artwork          |
| fill + color      | "fill red"                                                                                                                                             | —                                                                                | sets the color AND activates the fill tool                                                       |
| mirror on/off     | "mirror on", "mirror off", "symmetry on"                                                                                                               | شغّل التناظر، أطفئ التناظر                                                       | vertical symmetry on / off (mirror phrases never trigger "play")                                 |
| stroke assistance | "steady my stroke", "natural stroke"                                                                                                                   | ثبّت الخط، خط طبيعي                                                              | sets the visible Steady stroke control to 60% or 0%; affects future strokes only                 |
| bigger / smaller  | "bigger", "make it bigger", "thicker" / "smaller", "make it smaller", "thinner"                                                                        | أكبر / أصغر                                                                      | selected artwork scales gently about its center; with no selection, brush size ×~1.5 or ÷~1.5    |
| move / center it  | "move it left/right/up/down", "center it"                                                                                                              | حرّك هذا لليسار/اليمين/الأعلى/الأسفل، ضع هذا في المنتصف                          | nudges the selection by 10 px or centers it on the canvas; each is one undoable action           |
| clarify movement  | "move it" → "left/right/up/down"                                                                                                                       | حرّك هذا ← يسار/يمين/أعلى/أسفل                                                   | asks which way without moving, then accepts one spoken, typed or visible direction choice        |
| place at edge     | "put it at the top", "move it to the right edge"                                                                                                       | ضع هذا عند الحافة العلوية / اليمنى                                               | places the selection's shared bounds flush with that canvas edge as one undoable action          |
| continue nudge    | "again", "a little more"                                                                                                                               | مرة أخرى، قليلًا بعد                                                             | immediately repeats only the last successful directional 10 px nudge; otherwise refuses safely   |
| delete / copy it  | "delete it", "remove that" / "duplicate it", "copy that"                                                                                               | احذف هذا / انسخ هذا                                                              | deletes only the selection / makes and selects an offset copy; both are undoable                 |
| save              | "save"                                                                                                                                                 | احفظ                                                                             | saves now                                                                                        |
| help              | "help", "commands"                                                                                                                                     | مساعدة، أوامر                                                                    | speaks the full command list                                                                     |
| confirm / cancel  | "yes", "yeah sure" / "no", "cancel"                                                                                                                    | نعم / لا، ألغِ                                                                   | answers the clear confirmation only when all meaningful words are answer words                   |

Persian provides the same complete intent surface. Canonical phrases include
واگرد / بازانجام, پاک کن, فریم جدید, یک داستان درباره…, پخش / توقف,
بازی من, پیش‌نمایش برنامه, خروجی برنامه, کد واقعی, ضبط روایت / پایان ضبط /
ضبط را حذف کن, قلم‌مو / مداد / پاک‌کن / سطل / عصا / مهر / متن, آینه روشن /
آینه خاموش, خط را ثابت کن / خط طبیعی, بزرگ‌تر / کوچک‌تر, ذخیره, راهنما and
بله / نه. Persian color
names cover the same palette, and a fill-tool phrase plus a color performs
both choices in one command.

Simplified Chinese provides the same complete intent surface without requiring
spaces between words. Canonical phrases include 撤销 / 重做, 清空, 添加帧,
制作一个故事…, 播放 / 停止, 玩迷宫, 预览应用, 导出应用, 导出真实代码,
录制旁白 / 停止录音 / 删除旁白, 画笔 / 铅笔 / 橡皮擦 / 填充 / 魔棒 /
印章 / 文字, 打开镜像 / 关闭镜像, 稳定笔触 / 自然笔触, 大一点 /
小一点, 保存, 帮助 and 确认 / 取消. Polite prefixes may surround a command,
and English remains available.

### The color vocabulary (22 words)

red `#ef4444`, orange `#f97316`, yellow `#facc15`, green `#22c55e`,
teal `#14b8a6`, sky `#38bdf8`, blue `#3b82f6`, purple/violet `#a855f7`,
pink `#ec4899`, brown `#92400e`, black `#1f2937`, white `#ffffff`,
gray/grey `#6b7280`, cyan `#06b6d4`, magenta `#d946ef`, gold `#eab308`,
lime `#84cc16`, navy `#1e3a8a`, peach `#fdba74`, lavender `#c4b5fd`.
Arabic: أحمر، برتقالي، أصفر، أخضر، فيروزي، سماوي، أزرق، بنفسجي،
وردي/زهري، بني، أسود، أبيض، رمادي، ذهبي.
Persian: قرمز، نارنجی، زرد، سبز، فیروزه‌ای، آسمانی، آبی، بنفش،
صورتی، قهوه‌ای، مشکی/سیاه، سفید، خاکستری، طلایی.
Simplified Chinese: 红色、橙色、黄色、绿色、青绿色、天蓝色、蓝色、紫色、
粉色、棕色、黑色、白色、灰色、金色.
Brazilian Portuguese provides the same complete surface with phrases such as
desfazer / refazer, limpar, novo quadro, criar uma história sobre…, tocar /
parar, jogar labirinto, pré-visualizar meu app, exportar meu app, código real,
gravar narração / parar gravação / excluir narração, pincel / lápis / borracha /
preencher / varinha / carimbo / texto, ligar / desligar espelhamento, maior /
menor, estabilizar meu traço / traço natural, salvar, ajuda and sim / não. Its color words include vermelho, laranja,
amarelo, verde, turquesa, azul, roxo/violeta, rosa, marrom, preto, branco,
cinza, ciano, magenta and dourado.

Russian provides the same complete surface with phrases such as отменить /
повторить, очистить всё, новый кадр, создай историю про…, воспроизвести /
остановить, играть в лабиринт, показать приложение, экспортировать приложение,
настоящий код, записать озвучку / остановить запись / удалить озвучку, кисть /
карандаш / ластик / заливка / палочка / штамп / текст, включить / выключить
отражение, стабилизировать штрих / естественный штрих, больше / меньше,
сохранить, помощь and да / нет. Its color words
include красный, оранжевый, жёлтый, зелёный, бирюзовый, голубой, синий,
фиолетовый, розовый, коричневый, чёрный, белый, серый, циан, пурпурный and
золотой; common instrumental forms work in fill commands.

### Precedence rules (the parser's decision order)

1. Confirmation answers (yes/no) — only when every meaningful word is an
   answer; mixed corrections continue to their requested command.
2. Help, undo, redo, then **narration phrases** — they contain stop and
   clear words ("stop recording" isn't stop; «امسح الصوت» isn't clear) —
   then the make-a-story phrases, clear and new frame. "Tell the story" stays
   narration; it never creates a storyboard.
3. **Mirror and stroke-assistance phrases before tool and play words** —
   "شغّل التناظر" turns mirroring on rather than starting playback, and a
   natural-stroke request changes its visible setting rather than choosing a
   line tool.
4. App preview/export, the make-real code export, stop, game intents,
   play, save.
5. Bigger/smaller, bare "mirror" (→ on), "fill + color", tool words,
   color words. Anything unmatched → no-op with the kind fallback message.

## The settings gear

One menu consolidates it all: Little Dreamer mode, Speak tool names, Voice
feedback, Dark mode, Comfort mode, Touch feedback, Language, and — when the
browser offers it — Install Dream. Touch feedback defaults on but does nothing
on unsupported hardware; people can turn it off, and reduced-motion preference
keeps it silent. Every tactile cue repeats an already-visible interaction state.
Selection alignment uses the same boundary: a guide line and compact “snapped”
confirmation remain the primary feedback, while entering a new guide may add
one tiny cue and continuing along it never repeats the vibration. A game may
add one short impact when a collision visibly spends a life; ordinary movement,
scoring and the game-over state do not add extra vibration.

## Edge cases

- Voice command on a locked/empty context degrades kindly ("This layer is
  already empty.", "Nothing to play yet — add some frames first.").
- With no selection, "Bigger" at brush size 64 stays 64 and "smaller" at 1
  stays 1. With a locked selection, both refuse and leave brush and art exact.
- “Delete it” and “duplicate it” require a visible editable selection. Missing
  and locked selections get named guidance; neither phrase clears a layer or
  changes the brush.
- “Move it left/right/up/down” and “center it” require a visible editable
  selection. Movement uses a predictable 10 px step, centering uses the canvas
  center, every result is one undoable action, and bare directions do nothing.
- “Move it” with an editable selection asks which direction and makes no edit.
  An unknown answer asks again; Cancel, closing the conversation or a different
  valid command clears the question. Missing or locked selection guidance does
  not start a follow-up.
- “Put it at the left/right/top/bottom edge” requires a visible editable
  selection and places its shared bounds exactly at that canvas edge as one
  undoable action. It never changes a hidden alignment setting.
- “Again” and “a little more” work only on the voice turn immediately after a
  successful directional nudge. Any interruption or unavailable selection
  clears the context; no destructive or non-nudge action is repeatable.
- “Make it red” requires selected editable vector artwork and is one undoable
  recolor. A bare “red” remains a brush choice; raster pixels are referred to AI
  Edit rather than receiving false success feedback.
- A pending "clear?" confirmation is cancelled by any non-yes utterance. A
  command within that correction (such as “no, undo”) then runs normally.
  Closing the conversation cancels the pending confirmation.
- Spoken names never fire where synthesis is missing — the UI simply
  stays silent rather than erroring.
