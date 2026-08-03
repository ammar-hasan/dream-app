# Animation (the flipbook)

**Purpose.** Turn any drawing into a frame-by-frame animation — deliberately
a flipbook, not a pro timeline: big thumbnails, one big play button,
everything called "frames".

## The model

1. The **Animate** toggle in the toolbar turns animation on: the current
   layer stack becomes frame 1, and the timeline bar appears at the bottom.
2. Each frame owns its own complete layer stack; the layers panel and all
   tools always edit the **current frame**.
3. Turning animation off keeps only the current frame's stack (the other
   frames are discarded) — undoable, like everything else.
4. Old documents without frames load with animation simply off.

## Frame operations (all undoable)

- **Add (`+`):** a blank frame (one empty layer) inserted after the current
  frame, becoming current.
- **Duplicate (⧉):** a full copy of the current frame inserted right after
  it.
- **Reorder (←/→):** move the current frame one position.
- **Delete (✕):** removes the current frame; the nearest neighbor becomes
  current. **The last frame can never be deleted.**
- **Clicking a thumbnail** switches the current frame. Switching is
  navigation — like scrolling — and is intentionally **not** undoable.

## Onion skin

- The **Onion** toggle (default off) ghosts the **previous** frame beneath
  the current one while drawing.
- Opacity slider 5–80%, default 30%.
- Optional **Next** toggle also ghosts the next frame.
- Onion skin hides during playback.

## Playback

- Play/pause in the main viewport; playback starts at frame 1.
- **FPS 1–24, default 6.** Frames advance evenly at the chosen rate.
- **Loop** on/off (default on). With loop off, playback stops on the last
  frame.
- **Editing pauses while playing**: pointer input on the canvas does
  nothing during playback; undo/redo, mode switches and frame clicks all
  stop playback.
- **Space** toggles play only when the timeline has focus (click any frame
  first); everywhere else Space stays hold-to-pan.

## The timeline bar

Appears at the bottom whenever a document has frames: a collapse toggle, a
big play/pause button, live thumbnails (56 px tall, numbered, in play
order), the dashed `+` add button, frame controls (⧉ ←/→ ✕), a Slide settings
button, the narration mic, the fps slider, Loop and Onion toggles. Thumbnails update when their
frame's content changes — editing frame 3 never repaints the others.

On a phone, the timeline keeps the frame thumbnails, add button and frame
controls visible, then asks which job the user is doing: **Animate**,
**Slides** or **App**. Animate shows playback, narration, speed, looping and
onion-skin controls; Slides shows the current frame's slide settings; App
shows one next step to link the frames, or to preview once links exist. Only
the chosen job's controls are visible. Little Dreamer mode stays on the
simpler animation path and does not show this job chooser. Wider layouts keep
the complete timeline visible together.

## Story to animation

**Story** in the adult toolbar and **Tell a story!** in Little Dreamer mode
turn one spoken or typed idea into a small, reviewable flipbook:

1. The user tells a story in English, Arabic or Persian. Speech recognition fills the
   same story box where the device supports it; the control simply hides where
   it does not. In Little Dreamer mode, finishing dictation immediately shows
   the plan without requiring a second, reading-dependent action.
2. Dream plans **two to six** short moments locally and deterministically. No
   picture provider is contacted and the document does not change while
   planning.
3. Every planned moment is visible before creation. The user can edit it, hear
   it read aloud, remove it (never below two), add one (never above six), or
   plan the whole story again after changing the original words.
4. **Make animation** paints the reviewed moments in order. Recurring
   characters, clothes and colors are requested consistently across the whole
   story, and pictures contain no generated lettering; the reviewed moment is
   kept separately as that frame's caption.
5. Nothing is added until every picture succeeds. A failure leaves the
   document exactly as it was. On success the complete batch is one undoable
   change: one Undo removes every generated frame and Redo restores them.

On a blank static canvas, the generated moments become the complete animation.
Existing static artwork is preserved as frame 1 before the generated moments;
an existing animation keeps all its frames and receives the new moments after
them. A newly created storyboard loops, starts playing at one frame per second,
and selects its first generated frame. Existing animation timing remains the
user's own.

The active image-capable AI paints the moments. If the configured assistant
cannot paint images, the working built-in painter is used and named before
confirmation. One complete built-in storyboard spends one free try—not one try
per frame; an image-capable bring-your-own provider is unlimited.

## Voice narration

One **voice narration** take per document — a single track that starts at
time 0 of the animation. Per-frame tracks are deliberately out of scope: one
"tell the whole story" take matches how kids and presenters actually narrate
and keeps recording a one-tap gesture.

- The timeline bar carries a **mic button**. Tapping it starts recording AND
  starts playback, so the timing is natural — you talk over your flipbook as
  it plays. Tapping again (or the stop affordance) ends the take and saves
  it.
- **Re-recording replaces** the previous take, after a gentle inline
  confirmation ("Record over your story?"). In kid mode there is no
  confirmation — no reading required — the new take simply replaces the old.
- A take can be **deleted** (one tap) and **muted** (a session toggle; the
  take stays saved).
- While recording, a **pulsing red dot, the elapsed time and a live mic
  level** make the recording unmistakable.
- The microphone is asked for **on the first record only**. Denial or a
  missing/busy microphone gets a friendly, jargon-free message; where the
  device cannot record audio at all, the mic button simply isn't there.
- **Privacy:** the narration never leaves the device — it is stored with the
  project like any other document data.
- During playback the narration **plays from the start**, in sync with the
  flipbook (unless muted). The take plays once; if a looping animation runs
  longer, the voice simply stops.
- Kid mode gets a big friendly mic ("Tell the story!") — one tap deep, like
  everything else.
- Very long takes (over ~10 MB saved) earn a gentle warning that the project
  may get too big to keep.

## Export

The Export dialog offers, for animated documents:

- **Video shape:** Original preserves the document pixels. Vertical 9:16 is
  720×1280, Square 1:1 is 720×720 and Landscape 16:9 is 1280×720. Social
  shapes contain and center the complete artwork over its own background;
  they never crop or stretch it. The chosen shape adds `-vertical`, `-square`
  or `-landscape` to the filename. The animation still changes at its chosen
  1–24 fps; the delivery stream requests 30 fps and repeats held frames, so
  slow flipbooks remain visually identical in common social-video pipelines.
- **Frame captions:** every frame can carry a short on-screen caption, edited
  either with its slide settings or while preparing a video. The export editor
  steps previous/next, can copy one caption to every frame, and commits all
  changed captions as one undoable project edit when Export is pressed.
  Authoring is capped at 160 characters per frame. Captions wrap to at most
  three centered lines, ellipsize overflow, and are burned into the lower safe
  area over a high-contrast backing. They are part of the project, not a
  separate subtitle file.
- **Video trim:** Start frame and End frame choose one inclusive contiguous
  range for WebM or MP4. The duration and recording progress reflect only that
  range. Trimming changes only the delivery: it never deletes, reorders or
  alters source frames, captions or undo history, and reopening Export starts
  with the complete animation again. When narration exists, audio begins at
  the selected start frame's matching time (`start offset ÷ fps`) and stops
  with the trimmed video, so picture and voice remain synchronized.

- **WebM video** — recorded on-device in real time (a 12-frame animation
  at 6 fps records for 2 seconds). Codec preference: VP9 → VP8 → generic
  WebM, the first the device supports; if none, a plain error says this
  browser can't record WebM. Progress shows "Frame N of total" while
  recording; the dialog asks you to keep the tab in front. Filename
  `{name}.webm` for Original. **A saved narration is baked in as the video's audio
  track** — the exported movie talks; without a take the export is
  unchanged (silent).
- **MP4 video** — shown only when the browser reports native MP4 recording
  support. It uses the browser's compatible MP4 codec, follows the same
  frame timing/progress flow, includes narration when present, and downloads
  as `{name}.mp4` for Original. No transcode or relabeled WebM fallback is allowed: an MP4
  download is always a real MP4 container.
- **Sprite sheet** — all frames in one PNG grid: up to **8 columns**
  (columns = the smallest of: frame count, 8, and the ceiling of the square
  root of the frame count), rows as needed, each cell the full document
  size, no padding. Filename `{name}-frames.png`.
- **Interactive app (.html)** — see `app-mode.md`.

(GIF is deliberately absent; the sprite sheet covers the animated-asset
use case.)

## Interaction with document-wide operations

**Crop and resize apply to every frame** as a single undo step — the whole
flipbook is reframed, not just the current frame.

## Persistence

Frames, their captions, animation settings (fps, loop, onion preferences) and
the narration take are saved with the project. Caption edits are undoable
document changes. Animation settings and the narration live
outside undo (principle 3) — undo must never change how fast you watch your
flipbook, and must never delete a recording. Old saves load unchanged —
animation simply stays off, and there is no narration.

## Edge cases

- Playing a one-frame animation shows that frame (loop holds it; non-loop
  ends immediately).
- Deleting frames that hotspots point at creates **broken hotspots** —
  flagged in the Links panel, ignored in previews/exports (`app-mode.md`).
- Switching to Present or Play mode stops playback.
- The narration survives every frame operation untouched — deleting frames
  never deletes the take; only the delete-narration affordance does.
