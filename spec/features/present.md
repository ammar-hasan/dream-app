# Present mode

**Purpose.** Turn frames into a full-screen experience: a slideshow to click
through, or — the same machinery — an interactive app preview where only
hotspots respond.

## Behavior

1. Present is the fourth workspace mode. It takes over the whole window:
   the document scaled to fit (94% of the window, letterboxed on the dark
   stage `#10131a`), centered, crisp on high-density displays.
2. **No editing while presenting.** The tool rail, panels and timeline are
   gone.
3. Present is **session-only**: a project saved mid-presentation reopens in
   Draw mode.
4. Present starts on the frame that was current when entering. **Esc** or
   the Exit button (top-end) returns to the previous editing workspace
   (Draw or Design).
5. A document without frames is a one-slide deck ("1 / 1").

## Slideshow flavor (default)

- **Advance:** →, ↓, Space, Page Down, Enter, or click anywhere.
- **Back:** ←, ↑, Page Up.
- No wrap-around: the deck clamps at the first and last slide.
- A slide counter ("n / N") sits at the bottom center.

### Slide settings

Each real frame can optionally describe how it behaves as a slide. These
settings are edited together as one undoable change and are copied when the
frame is duplicated.

- **Transition into this slide:** none (the backward-compatible default),
  fade or slide. It applies to click, keyboard and automatic navigation.
- **Duration:** 1–60 seconds. When absent, the slide waits for manual
  advance. A deck may freely mix timed and manual slides.
- **On-screen caption:** optional short viewer-facing text shared with video
  export. It is burned into shaped video exports but does not appear over a
  live slideshow.
- **Speaker notes:** optional presenter-only plain text. Notes never appear in
  the audience window or over its canvas; they exist only in the separate
  Presenter window.

The **Auto** session toggle follows each slide's duration. It pauses on an
untimed slide and at the end of the deck. The **Presenter** session toggle
opens a separate synchronized window, leaving the audience stage clean. The
private window contains:

- the current slide preview, number and speaker notes;
- session elapsed time, the current slide's authored timing and a live
  remaining-time countdown when that slide is timed;
- the next slide's number and visual preview, or an unmistakable end-of-deck
  state;
- Previous, Next and Auto controls that drive the audience window, plus actions
  to bring the audience window forward, close only the Presenter window, or
  exit the whole presentation.

Keyboard navigation also works while the Presenter window has focus. Slide
changes from click, keyboard, Auto or either window stay synchronized. Closing
the Presenter window leaves the audience presentation running; leaving Present
or switching to App closes it. If the browser blocks the extra window, the
audience stage shows a friendly request to allow Dream pop-ups and no notes are
exposed there. Presenter and Auto remain session-only and are never saved.

## App flavor

A **Slideshow / App** toggle (top-start) switches flavors any time. In App
flavor it behaves like an app, not a slideshow — full hotspot semantics in
`app-mode.md`:

- Only hotspots are tappable; arrow keys, Space and clicks elsewhere do
  nothing.
- Hovered/touched hotspots show a subtle accent highlight and the pointer
  cursor.
- Transitions: fade/slide play 220 ms out + 220 ms in (opacity/transform
  only); "none" jumps instantly.
- A subtle **Restart** button (bottom-end) returns to the starting frame.
- Broken and self-targeting hotspots do nothing.

## Edge cases

- Entering Present stops any animation playback.
- The flavor toggle choice is session state — every Present session opens
  in Slideshow flavor.
- The Presenter window is optional. A blocked or manually closed window never
  pauses or changes the audience slideshow.
- Under reduced-motion, transitions render instantly (see
  `../visual-identity.md`).
- Old projects have no slide settings and therefore remain instant, manual
  decks with no notes.

## Voice narration

If the document has a narration take (see `animation.md`), it **plays once
from the start** when a Present session opens — the presenter tells the
story over the slides, hands-free. A small indicator button (bottom-end)
shows that a narration exists and toggles **mute**; muting stops the voice
immediately, unmuting restarts it from the beginning. The mute choice is
session state shared with the editor's playback. Without a take, no
indicator appears.
