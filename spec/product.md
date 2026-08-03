# Product

## Vision

Dream is an intuitive, simple, elegant design app: **as simple as MS Paint,
as deep as Photoshop**, AI-assisted, and usable by anyone from a 5-year-old
to a 95-year-old — literacy optional. It is free, runs entirely on the user's
device (no account, no backend), and turns drawings into designs, animations,
presentations, games, and interactive app prototypes.

The heart of the app: a canvas so natural it doesn't need teaching. Features
exist in depth but are never thrown at the user — depth surfaces per
**workspace mode** (Draw / Design / Play / Present) and per **audience**
(adult / Little Dreamer kid mode / senior comfort mode).

## Personas

The ten design targets (condensed from the product vision document):

| #   | Persona               | Profile                             | What Dream must do for them                   |
| --- | --------------------- | ----------------------------------- | --------------------------------------------- |
| 1   | Zainab, 5, Iraq       | pre-literate, on her mother's phone | voice-driven creation, kid mode, games        |
| 2   | Victor, 85, Ireland   | retired civil engineer              | comfort mode, zero-jargon UI                  |
| 3   | Ali, 30, Pakistan     | professional artist with a stylus   | pen pressure, layers, image editing           |
| 4   | Fatima, 21, Iran      | calligraphy explorer                | RTL, precise drawing tools                    |
| 5   | George, 45, USA       | no formal education, new phone      | fully visual UI, voice, animations            |
| 6   | Sara, 15, Nigeria     | freelance logo designer             | Design mode, components, export               |
| 7   | Zǐxuān, 28, China     | chemistry PhD                       | scientific images, animation, apps            |
| 8   | Maria, 32, Brazil     | agentic-AI programmer               | `.dream` files, the agent tool surface        |
| 9   | Aleksandr, 25, Russia | product design expert               | everything, fast — snapping, align, shortcuts |
| 10  | Ahmed, 42, Palestine  | social-media storyteller            | draw → animate → export video                 |

## Design principles

These are product laws. Every feature file assumes them; a rebuild must
honor every one.

1. **Modelessness by default.** One canvas; depth appears per mode. Draw
   mode is the MS-Paint-simple default and is never complicated by the
   existence of the other modes.
2. **Everything is undoable.** Every change to the document can be undone,
   exactly, through one shared undo history, 200 steps deep. Undo/redo is
   never lossy and never surprising.
3. **Undo never teleports.** Undo must not flip the user's workspace mode,
   change animation playback settings, re-cast their game, or jump them to
   another frame. Those are navigational/playback state and live outside
   undo — while document content (including frame add/duplicate/delete/
   reorder and every stroke) is always undoable.
4. **Ages 5 to 95, literacy optional.** Kid mode (giant icon-only tools,
   bright named palette, spoken tool names), comfort mode (bigger text and
   targets, stronger contrast), and full voice control (English + Arabic +
   Persian + Simplified Chinese + Brazilian Portuguese + Russian)
   are first-class, per-user preferences — never per document.
5. **Local-first and private.** Documents, preferences, and the component
   library live on the device. The app works fully offline. AI API keys are
   session-only secrets by default and never logged.
6. **Free, with bring-your-own AI.** Every feature is free. The built-in AI
   assistant has a limited free daily allowance; connecting your own AI
   provider removes the limit entirely. No feature is ever paywalled.
7. **Deterministic where it matters.** A spray stroke looks identical on
   every redraw and every export. The same AI prompt paints the same
   picture. Same input, same pixels.
8. **No dead ends.** Where a capability is missing (a browser without
   speech recognition, an AI provider that can't paint), the UI says so
   kindly and offers the working path — it never fails silently or shows
   jargon.
9. **Kind voice.** All copy is warm, plain, and encouraging, written for
   children and grandparents. Errors say what to do next. (Tone rules and
   examples: `visual-identity.md`.)

## What Dream is not

- Not a pro timeline editor: animation is a flipbook — frames, onion skin,
  play, export. No keyframes, no tracks.
- Not a game engine: Play mode offers fixed, friendly game templates that
  your drawings are cast into. No scripting.
- Not a website builder: App mode exports clickable prototypes, not
  production applications.
- Not a cloud product: no accounts, no collaboration, no sync (by design).
