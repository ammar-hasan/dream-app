# App mode (interactive prototypes)

**Purpose.** Draw your screens as frames, link them with hotspots, preview
the app, and export it as **one self-contained HTML file** you can send to
anyone — it opens in any browser, works offline, no Dream required.

## Hotspots

1. **The Link tool (U, Design mode)** — with animation on (each frame is
   one screen), drag a rectangle over a button you drew. Drags smaller than
   4×4 px are dropped as slips.
2. The **link dialog** asks "when tapped, go to frame…" — defaulting to the
   next frame (wrapping) — plus an optional transition: **none / fade /
   slide** (default **fade**).
3. While the Link tool is active, hotspots show as soft accent-tinted
   dashed rectangles (10% accent fill, dashed accent stroke) with a tiny
   link glyph in the corner.
4. Every add, edit and delete is undoable.
5. **The Links panel** (Design mode) lists the current screen's hotspots:
   retarget via the frame dropdown, change the transition, delete.
6. A hotspot whose target frame was deleted is **broken**: flagged in the
   panel ("Deleted frame"), ignored in previews, dropped from exports,
   until retargeted or removed. Hotspots targeting their own frame are
   likewise inert in preview.

## Preview app

The **Preview app** button in the Links panel (or saying "preview my app")
opens Present mode in **App flavor** (see `present.md`):

- Only hotspots are tappable — hover shows the pointer and a subtle accent
  highlight; arrows, Space and clicks elsewhere do nothing. It's an app,
  not a slideshow.
- Fade/slide transitions are opacity/transform-only, 220 ms per direction.
- Subtle **Restart** and **Exit** affordances. The **Slideshow / App**
  toggle inside Present switches flavors any time.

## The exported standalone HTML file

Export → **Interactive app (.html)** downloads `{name}-app.html`. The
exported file's behavior contract:

1. **One file, zero dependencies, zero external URLs.** Every screen is
   flattened to a PNG data URL; works offline from a double-click.
2. **Structure:** screens stacked in a fixed-size stage (the document
   size, rounded 8 px corners, white with a soft shadow) on the dark
   `#10131a` page; the stage scales to fit any window
   (`scale = min(window/doc)`, centered).
3. **Hotspots are real transparent buttons** positioned by percentage
   (3-decimal precision) over the screen image — natively
   keyboard-accessible (Tab to focus, Enter to activate), with hover/focus
   highlight (accent tint + dashed outline) and an accessible label
   ("Go to screen N"). Broken hotspots are dropped.
4. **Navigation:** tap → transition → screen. Fade and slide animate
   250 ms (a 270 ms settle); "none" is instant. Double-taps during a
   transition are ignored. The page respects reduced-motion (transitions
   become instant).
5. **Start screen:** the frame that was active at export time.
6. **Restart:** a pill button in the corner fades back to the start
   screen; the **Home key** does the same.
7. **A small "Made with Dream" corner** sits at the bottom.
8. The page title is the document name (HTML-escaped), defaulting to
   "Dream app".

## Discovery

With two or more frames and no links yet, the timeline shows a gentle
"**Link your frames to make an app →**" hint that activates the Link tool.
It disappears once any hotspot exists; kid mode never shows it (Play mode
stays the kid path).

## Voice

"Preview my app" opens the app preview (needs frames — otherwise a kind
"add some frames and links first"); "Export my app" downloads the HTML
file.

## Edge cases

- Exporting with zero frames is impossible (the option needs frames);
  exporting with zero hotspots produces a working but inert single-screen
  file.
- A document with hotspots but animation off can't exist — hotspots live
  on frames.
- Very large hotspot rectangles and edge-to-edge screens clamp cleanly
  into the percentage geometry.
