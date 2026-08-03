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

## The shareable app link

Export → **Share app link** prepares a URL that opens directly as the same
pixel-faithful interactive prototype, without an account or server-side
project storage.

1. The link contains only flattened screen pictures, working hotspot geometry,
   transitions, the start screen, size and title. It never includes editable
   layers, hidden artwork, speaker notes, captions, narration, game settings,
   provider settings or API keys.
2. Opening the link shows the prototype directly—never the editor—and retains
   the standalone app's scaling, keyboard-accessible hotspots, transitions,
   restart behavior and reduced-motion support.
3. The complete viewer payload lives in the URL fragment, is compressed where
   the browser supports it, and makes no upload or provider request. A receiver
   who has already cached Dream can reopen it offline.
4. **Copy link** is the universal action. The prepared URL remains visible and
   selectable if automatic clipboard copying is unavailable.
5. Share links are deliberately for small prototypes. Dream refuses links over
   100,000 characters or viewer data over 2 MB and points the user to the
   self-contained Interactive app file instead.
6. Incoming viewer data is bounded and validated before use: only embedded PNG
   screens of the declared size, finite in-frame hotspot geometry, valid frame
   targets and known transitions are accepted. A damaged or unsafe link opens
   the normal editor with a friendly warning and does not execute supplied
   markup.

## The exported real-code file (AI)

Export → **Real code (AI) (.html)** downloads `{name}-code.html`: the app
rewritten as REAL, readable code — a developer (or a kid's parent) can open
it, learn from it and extend it. Where the interactive-app export is a
pixel-faithful picture of the app, this export is the app as source.

1. **The input preserves meaning and real raster content.** The app is
   described structurally and compactly — per screen: its background,
   dominant colors, texts (content, position, size, color), drawn things
   summarized as boxes (kind, position, size, color — strokes, shapes and
   fills), and the navigation graph (which rectangle on screen N goes to
   screen M, with which transition). Imported and AI-made raster images are
   embedded as inline PNGs so they remain real images in the result. Broken
   hotspots are dropped here too.
2. **Two generation paths.**
   - With a **chat-capable connected provider**, the description goes out
     with instructions to reply with exactly ONE self-contained HTML file:
     semantic (each screen a section, texts as real text, tappable areas as
     real buttons), accessible, responsive, commented for beginners, with
     navigation as a small hash router and no external assets.
   - With **Dream AI**, a deterministic local generator builds the app from
     the same description — free, fully offline, same document in, same
     file out. The output is honestly labeled "generated locally by Dream
     AI — connect your own AI for richer code", and each generation counts
     against the daily free tier like every other Dream AI action. Its
     drawings become soft approximation panels, while imported and AI-made
     raster images remain their actual pixels in real image elements.
3. **Validation before download.** The result must be one complete HTML
   document with no external web references. A refusal, chatter without
   code, or code that links outside is rejected with a friendly error that
   suggests retrying or using the deterministic interactive-app export
   instead.
4. **The file's contract:** it opens with a comment "Made with Dream —
   where drawings come alive.", is commented and beginner-friendly, carries
   the drawing's colors and words, opens on the frame active at export
   time, works fully offline, and navigates by hash so the browser Back
   button works.
5. **The flow:** while generating, the dialog shows "Dreaming in code…";
   on success the file downloads and a small note confirms — naming the
   local generation when Dream AI wrote it.

## Discovery

With two or more frames and no links yet, the timeline shows a gentle
"**Link your frames to make an app →**" hint that activates the Link tool.
It disappears once any hotspot exists; kid mode never shows it (Play mode
stays the kid path).

## Voice

"Preview my app" opens the app preview (needs frames — otherwise a kind
"add some frames and links first"); "Export my app" downloads the HTML
file; "Export real code" (or "make it real") downloads the AI-generated
code file (same frames requirement).

## Edge cases

- Exporting with zero frames is impossible (the option needs frames);
  exporting with zero hotspots produces a working but inert single-screen
  file.
- A share link may be unavailable for a visually large project even though the
  Interactive app file remains available; this is a transport limit, not lost
  work.
- A document with hotspots but animation off can't exist — hotspots live
  on frames.
- Very large hotspot rectangles and edge-to-edge screens clamp cleanly
  into the percentage geometry.
