# Roadmap

Dream ships in slices. Slice 1 (core drawing app + harness) is done. Each slice below
lists brief acceptance criteria; slices are roughly ordered by dependency, not by a
fixed schedule.

## Slice 2 — Image filters & adjustments

- Import an image onto a layer (file picker / drag-drop / paste).
- Per-layer raster filters: brightness, contrast, saturation, hue, blur, sharpen,
  grayscale, invert — implemented in the engine as pure pixel transforms.
- Non-destructive: filters are operations in the layer stack, so undo/redo works.
- Acceptance: user can import a photo, apply + tweak + reorder filters, undo any step,
  and export the result as PNG; filters have unit tests on synthetic pixel buffers.

## Slice 3 — Design mode: layers, components & selection

- Select/move/resize/rotate operations and whole layers with a selection tool.
- Group operations into reusable **components**; instances stay linked to the master.
- Asset panel with the user's components; drag onto any document.
- Acceptance: user draws a button, turns it into a component, reuses it in a second
  document, edits the master, and sees instances update; all undoable.

## Slice 4 — Animation timeline

- Frame-by-frame animation: layers get a timeline; onion skinning; play/pause/loop.
- FPS control and per-frame duration.
- Export as animated asset (GIF/APNG or sprite sheet).
- Acceptance: user creates a 12-frame bouncing-ball loop and exports it; timeline
  state is covered by engine tests.

## Slice 5 — Video export

- Render animations to video client-side (WebCodecs/MediaRecorder), with optional
  audio track.
- Acceptance: user exports an MP4/WebM of a Slice-4 animation that plays in a
  standard player.

## Slice 6 — Presentation mode

- Documents become decks: pages/frames, transitions, presenter view, arrow-key
  navigation.
- Acceptance: user builds a 5-page deck from drawings and presents it fullscreen.

## Slice 7 — AI panel with BYOK providers

- UI panel wired to `src/ai` registry: generate image, edit region, get feedback.
- Bring-your-own-key: OpenAI/Anthropic/Gemini/etc. provider configs stored locally;
  Mock provider remains for offline/dev.
- Free-tier hosted quota + unlimited usage with own keys, per the product vision.
- Acceptance: user enters an API key, generates an image onto a layer, asks for
  feedback and gets actionable suggestions; provider errors degrade gracefully.

## Slice 8 — Voice commands

- Hands-free basics: "brush", "undo", "fill red", "new document".
- Acceptance: core drawing flow is drivable by voice with visible command feedback;
  works with mic permission denied (graceful no-op).

## Slice 9 — Kid mode

- Simplified UI preset: giant buttons, fewer tools, friendly sounds, no dialogs that
  require reading.
- Acceptance: a 5-year-old can pick a color and draw with zero literacy; toggle is
  one tap from the toolbar.

## Slice 10 — i18n & accessibility

- String externalization, RTL support, translations for top languages (per personas).
- Full keyboard navigation, ARIA roles, focus management, reduced-motion respect.
- Acceptance: UI switches language at runtime; axe-core audit has no critical issues.

## Slice 11 — PWA

- Installable, offline-first (service worker), document library available offline.
- Acceptance: Lighthouse PWA checks pass; app works fully with network off.

## Slice 12 — Games & app generation

- Conversational flow that turns drawings/animations into playable mini-games and
  simple apps; MCP/API hooks for developer workflows (persona: Maria).
- Acceptance: user sketches a character, describes a game in one sentence, and plays
  the result in-app.
