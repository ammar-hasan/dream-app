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
- Under reduced-motion, transitions render instantly (see
  `../visual-identity.md`).

## Voice narration

If the document has a narration take (see `animation.md`), it **plays once
from the start** when a Present session opens — the presenter tells the
story over the slides, hands-free. A small indicator button (bottom-end)
shows that a narration exists and toggles **mute**; muting stops the voice
immediately, unmuting restarts it from the beginning. The mute choice is
session state shared with the editor's playback. Without a take, no
indicator appears.
