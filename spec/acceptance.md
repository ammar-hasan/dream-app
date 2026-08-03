# Acceptance — the rebuild checklist

The proof that a rebuild is faithful. Sections A–J are numbered,
individually testable behavioral criteria (GIVEN/WHEN/THEN). Section K is
the ten end-to-end scenarios — each maps to a persona. Section L is the
visual/feel checkpoints. A rebuild passes when every applicable statement
holds.

## A. Core drawing & undo

1. GIVEN a blank document WHEN the user draws a brush stroke and presses
   undo THEN the canvas returns to blank; redo restores the stroke exactly.
2. GIVEN 201 document edits WHEN the user undoes repeatedly THEN exactly
   200 undo steps are available.
3. GIVEN a single tap with the brush THEN a visible round dot appears.
4. GIVEN the pencil or eraser WHEN opacity is 30% THEN the stroke is fully
   opaque anyway; the brush honors the 30%.
5. GIVEN a stylus stroke with varying pressure THEN stroke width varies
   smoothly along the path, never exceeding size × 1 or dropping below
   size × 0.1.
6. GIVEN an eraser stroke over artwork on a white background WHEN exported
   to PNG THEN the erased pixels are transparent (not white).
7. GIVEN a spray stroke WHEN the document is saved, reloaded and exported
   THEN the dot pattern is pixel-identical in all three.
8. GIVEN Shift held while dragging a line THEN its angle snaps to the
   nearest 45°; with rectangle/ellipse, the shape becomes a square/circle.
9. GIVEN "fill shapes" on WHEN a rectangle is dragged THEN it commits
   filled with no outline.
10. GIVEN mirror mode "quad" WHEN one stroke is drawn THEN four reflected
    strokes appear and ONE undo removes all four.
11. GIVEN a click on a flat-color region with the fill tool THEN exactly
    the contiguous same-color region fills; filling it again with the same
    color adds no undo step.
12. GIVEN the wand (tolerance 32) WHEN a pixel is clicked THEN the
    contiguous similar-colored region lifts into a floating patch; Esc
    restores the layer untouched; Delete removes the region as one
    undoable step.
13. GIVEN a stamp placed at Medium THEN its bounding box is 96 px and one
    undo removes the whole doodle.
14. GIVEN a starter scene inserted THEN it lands as a new layer of black
    outline art sized to the document, colorable with brush or fill.
15. GIVEN zoom WHEN the user steps +/− THEN zoom visits the ladder values
    (25…800%) and wheel zoom keeps the cursor point stationary.

## B. Layers, editing & images

16. GIVEN three layers WHEN the middle one is hidden THEN its content
    disappears from canvas and exports; undoing the hide restores it.
17. GIVEN a layer at 50% opacity WHEN exported THEN all its content
    renders at half alpha over what's below.
18. GIVEN a locked layer WHEN any draw/move/delete is attempted THEN
    nothing changes and the user is told why.
19. GIVEN an imported photo larger than the canvas THEN it lands centered
    on its own layer, scaled down to fit, never upscaled.
20. GIVEN the Adjust panel WHEN sliders change THEN the preview updates
    live; Cancel leaves the layer untouched; Apply bakes exactly one
    undoable change.
21. GIVEN the Vintage preset THEN the applied values equal sepia 70,
    contrast 15, brightness −5 — and the pixels match applying those
    sliders manually.
22. GIVEN a layer rotated 90° THEN it rotates around its own content
    center and stays in place.
23. GIVEN an animated document WHEN cropped THEN every frame crops and the
    whole operation is one undo step.
24. GIVEN a 1024×768 document resized to 512×384 THEN pixel content
    resamples nearest-neighbor (crisp, unblurred) and undo restores the
    exact original.

## C. Design mode

25. GIVEN two overlapping objects WHEN clicked at the overlap THEN the
    topmost selects; Shift-click adds the other.
26. GIVEN a marquee drag on empty canvas THEN every object intersecting
    the rectangle selects.
27. GIVEN a lasso loop around a small object inside a big one THEN only
    the small object selects (center-in-loop rule).
28. GIVEN a selection dragged near the canvas center THEN it snaps at
    6 px with a visible guide line; the snap toggle disables this.
29. GIVEN a selection of a stroke WHEN rotated via the top handle THEN any
    angle is possible; a selection containing an image rotates in 90°
    steps only.
30. GIVEN three objects WHEN "align left" is chosen THEN their left edges
    equal the selection's left edge; "distribute horizontally" evens the
    gaps.
31. GIVEN a grouped pair WHEN any member is clicked THEN both select and
    transform as one; ungroup restores individual selection.
32. GIVEN a saved component WHEN inserted twice and the component is then
    edited THEN the placed instances do not change; each instance sits on
    its own layer.
33. GIVEN Cmd/Ctrl+D on a selection THEN a copy appears offset from the
    original, as one undoable step.

## D. Animation & present

34. GIVEN a drawing WHEN Animate is toggled THEN the layers become frame 1
    and the timeline appears; toggling off keeps the current frame only
    (undoable).
35. GIVEN three frames WHEN the middle is deleted THEN neighbors close
    rank, the next frame becomes current, and undo restores the deleted
    frame in place.
36. GIVEN one frame WHEN delete is attempted THEN it is refused (the last
    frame always survives).
37. GIVEN frame 2 current WHEN the user undoes a stroke drawn on frame 1
    THEN frame 1's content restores without switching the user away from
    frame 2.
38. GIVEN onion skin on THEN the previous frame ghosts at 30% opacity
    (adjustable 5–80%) while drawing, and hides during playback.
39. GIVEN playback at 6 fps over 12 frames with loop off THEN the run
    lasts 2 seconds and stops on the last frame.
40. GIVEN playback running WHEN the user tries to draw THEN nothing is
    committed; pressing Space with the timeline focused pauses.
41. GIVEN a Present session THEN arrows/Space/click advance, ← goes back,
    the counter reads "n / N", Esc returns to the previous workspace, and
    a frameless document presents as "1 / 1".
42. GIVEN Present reopened later THEN it starts in Slideshow flavor (the
    app/slideshow choice is session state).

## E. Play mode

43. GIVEN a layer cast as the Catch! hero WHEN a run starts THEN the hero
    sprite is that layer's content cropped to its non-empty pixels;
    hiding the layer restores the smiley stand-in next run.
44. GIVEN Catch! defaults (adult) THEN things fall at 180 px/s, spawn
    every 1.1 s, 25% are bad, and the player has 3 lives.
45. GIVEN a good catch THEN score +1 with a "+1" pop; a bad catch costs a
    life with a shake; a missed thing costs nothing.
46. GIVEN a 75-second Catch! run THEN fall speed has doubled linearly.
47. GIVEN Flappy with 1 shield WHEN the hero clips a gate THEN the run
    ends; with 3 shields the hit costs one shield and grants 1.5 s of
    invulnerability.
48. GIVEN Maze Runner level 1 THEN the maze is 8×6 cells (5×4 kid),
    solvable, start top-left, exit bottom-right; walls never hurt.
49. GIVEN kid mode entering Play THEN sounds are on, big on-screen
    controls show, and defaults are gentler (5 lives, slower, sparser).
50. GIVEN a new best score THEN the game-over card says "New best!" and
    the best persists per project across reloads — but not into `.dream`
    exports.
51. GIVEN a run in progress WHEN the user switches workspace mode THEN
    the run stops cleanly.
52. GIVEN "play flappy" spoken WHEN Catch! was the template THEN the
    template switches, Play opens, and a run starts.

## F. App mode

53. GIVEN the Link tool WHEN a 3×3 px drag happens THEN no hotspot is
    created; a 10×10 drag opens the link dialog with the next frame
    preselected and fade chosen.
54. GIVEN a hotspot to frame 2 WHEN its target frame is deleted THEN the
    panel flags it broken and preview/export ignore it.
55. GIVEN app preview WHEN clicking outside any hotspot THEN nothing
    happens; arrows and Space do nothing.
56. GIVEN the exported HTML file WHEN opened with the network off THEN it
    shows the start screen, scales to the window, navigates on hotspot
    taps with the chosen transitions, restarts on Home, contains no
    external URLs, and displays "Made with Dream".
57. GIVEN hotspots in the exported file WHEN tabbing with a keyboard THEN
    each is focusable, labeled ("Go to screen N") and Enter-activatable.
58. GIVEN 2+ frames and no hotspots WHEN not in kid mode THEN the
    timeline shows "Link your frames to make an app →"; it vanishes once
    a hotspot exists.
59. GIVEN an animated document WHEN "Real code (AI)" is exported with
    Dream AI THEN the downloaded `{name}-code.html` contains one section
    per screen, the texts as real text, a button per hotspot wired to its
    target screen, imported and AI-made raster pictures as inline real image
    elements, no external web references, the header comment "Made with
    Dream — where drawings come alive." and the honest "generated locally
    by Dream AI" label — and one free try is spent.
60. GIVEN a chat-capable BYOK provider WHEN the code export runs THEN the
    provider receives the structured app description plus inline PNG pixels
    for its visible raster pictures, and only a reply containing one
    self-contained HTML file is downloaded; a refusal or code with external
    links is rejected with a friendly error suggesting a retry or the
    deterministic interactive-app export.
61. GIVEN the code export WHEN the daily free tier is spent THEN it is
    refused kindly with the BYOK path offered — the same 20/day counter as
    Create/Edit/Feedback; with BYOK active the export is unlimited.
62. GIVEN "export real code" spoken THEN the code export runs (needs
    frames); «صدّر كود حقيقي» works under the Arabic UI, and "export my
    app" still downloads the deterministic prototype.

## G. AI

63. GIVEN Dream AI WHEN "a starry night" is created twice at the same
    document size THEN both pictures are pixel-identical; each lands as a
    new layer named from the prompt.
64. GIVEN the Edit tab with "warmer" THEN the layer gains sepia 25,
    saturation 10, brightness 5 (plus unmentioned defaults); with
    "Selected part only" ticked, only the selection box changes.
65. GIVEN a blank canvas WHEN feedback is requested THEN it says the
    canvas is blank and encourages starting; on a flat, low-contrast
    drawing it suggests contrast with a one-click Apply that is undoable.
66. GIVEN 20 Dream AI actions in a day THEN the 21st is refused kindly
    with the BYOK path offered; the counter resets the next local
    calendar day.
67. GIVEN a BYOK provider without image-generation support THEN Create is
    disabled with an explanation; Edit is independently disabled unless an
    edits model is configured, and feedback still works.
68. GIVEN an API key saved without "remember key" WHEN the app closes and
    reopens THEN the key is gone but URL and model settings remain; keys
    never appear in logs, settings blobs or error messages.
69. GIVEN "Test connection" with a bad URL THEN the error asks "is the
    URL right and the app running?" — no status codes, no jargon.
70. GIVEN a BYOK endpoint with a configured edits model WHEN a selected-area
    edit runs THEN the provider receives the active-layer image, a same-size
    alpha mask and the prompt; only pixels inside the selection box can change,
    and one Undo restores the exact layer.
71. GIVEN that edits model is blank WHEN BYOK is active THEN generative Edit
    stays disabled with the working offline alternative offered; the setting
    persists when present without ever placing the API key in the settings.
72. GIVEN an edits-capable BYOK provider WHEN **Erase this** is pressed THEN
    the selection is removed and naturally filled using the neutral erase
    instruction, the action is undoable, and it spends no Dream AI free try;
    Dream AI never presents this as a generative erase.

## H. Accessibility, i18n & voice

73. GIVEN kid mode turned on THEN the app is in Draw mode with the brush,
    the rail shows the 9 kid tools, the 12-color palette and 3 dot sizes,
    and both voices are on; turning it off restores the adult UI.
74. GIVEN kid mode WHEN hovering the brush THEN "Brush!" is spoken (where
    synthesis exists) and no tooltip shows.
75. GIVEN comfort mode THEN base text is 16 px, targets ≥ 44 px, and
    contrast strengthens in the current theme — composing with dark mode,
    kid mode and RTL.
76. GIVEN "um, can you please undo?" spoken THEN one undo happens and the
    status confirms "Took that back!".
77. GIVEN "clear" spoken THEN the app asks for a spoken yes before
    wiping; "no" cancels and keeps everything.
78. GIVEN the Arabic UI WHEN "تراجع" is spoken THEN undo happens; "undo"
    still works too; "شغّل التناظر" turns mirroring on and never starts
    playback.
79. GIVEN "fill red" THEN the color becomes red `#ef4444` and the fill
    tool activates.
80. GIVEN "bigger" at size 8 THEN the size becomes 12; at 64 it stays 64.
81. GIVEN Arabic selected THEN the whole shell mirrors to RTL instantly
    without reload, and every string has an Arabic value (no English
    leakage, no missing keys).

## I. Persistence, files & offline

82. GIVEN an edit WHEN 800 ms pass without further edits THEN the project
    is saved on-device and the dirty dot clears.
83. GIVEN a drawing WHEN the app is closed and reopened THEN it restores
    from the last-opened pointer after the splash.
84. GIVEN a `.dream` export imported into a fresh Dream THEN document,
    frames, hotspots, game setup and narration are identical (opaque pixels
    exactly; vector content exactly).
85. GIVEN a `.dream` file with unknown extra fields WHEN loaded and
    re-saved THEN the unknown fields survive verbatim.
86. GIVEN a corrupt or version-2 `.dream` file WHEN opened THEN a plain
    error names the problem and nothing changes.
87. GIVEN the app loaded once WHEN the network is killed and the app
    reloaded THEN it boots and fully works offline.
88. GIVEN a new version downloaded WHEN the user hasn't pressed Refresh
    THEN the old version keeps running; pressing Refresh swaps once.
89. GIVEN the install offer dismissed THEN it never returns on that
    device.
90. GIVEN the component library WHEN a component is saved in project A
    THEN it is available in project B.

## J. Cross-cutting

91. GIVEN any document mutation WHEN undone and redone THEN the result is
    bit-identical to never having undone.
92. GIVEN undo history WHEN the user changes workspace mode, fps, onion
    settings, game casting, the narration or the active frame THEN none of
    those appear as undo steps — but frame add/duplicate/delete/reorder do.
93. GIVEN a project saved in Play or Present mode WHEN reopened THEN it
    opens in Draw.
94. GIVEN a hidden feature (no speech recognition, no audio, no
    recorder) THEN its button simply isn't there — never an error.
95. GIVEN reduced-motion OS preference THEN every animation and
    transition in the app and its exports is effectively instant.
96. GIVEN the dark theme THEN every surface, panel, dialog and tooltip
    uses the dark tokens; the choice persists.
97. GIVEN any list of projects or components THEN it sorts by
    last-modified, newest first.
98. GIVEN an animated document WHEN the timeline mic is tapped THEN playback
    starts and the voice records with a pulsing indicator and elapsed time;
    stopping saves the take, re-recording asks first (never in kid mode),
    deleting removes it, and undo never touches the take.
99. GIVEN a document with a narration WHEN the animation plays or a Present
    session opens THEN the take plays once from the start; the mute toggle
    silences it in both places and the choice is session state.
100.  GIVEN a document with a narration WHEN exported to WebM THEN the video
      carries the voice as its audio track; without a take the export behaves
      exactly as before (silent).
101.  GIVEN a browser without audio recording THEN the timeline mic simply
      isn't there; a denied or busy microphone gets a friendly, jargon-free
      message and nothing is recorded.
102.  GIVEN "record narration" spoken WHEN frames exist THEN recording starts;
      "stop recording" saves the take, "delete narration" removes it, and
      «أوقف التسجيل» / «امسح الصوت» never trigger stop or clear.
103.  GIVEN a `.dream` project through the agent surface WHEN the agent adds a
      layer, draws one filled or outlined shape and adds text to it THEN the app
      opens the same layer stack and content, the project summary counts both
      operations, and the rendered PNG contains them.
104.  GIVEN layers named Rocket and Clouds WHEN "My Rocket flies through Clouds,
      nice and slow" is typed or dictated and submitted in Play THEN Flappy Dream
      is selected, Rocket is the hero, Clouds are the obstacle, flight speed
      becomes gentle, and the ready message appears without a network request or
      an automatic game start.
105.  GIVEN Dream Jumper WHEN a seeded run starts THEN neighboring platforms
      remain within the jump envelope, each star scores once, a fall spends one
      life and respawns, reaching the flag wins, and "play platformer" / «العب
      المنصات» selects and starts the same template.
106.  GIVEN a frame WHEN its slide transition, duration and speaker notes are
      saved THEN they persist together as one undoable edit, redo restores
      them, and duplicating the frame copies them without linking future edits.
107.  GIVEN a slideshow WHEN entering a slide with fade or slide selected THEN
      click, keyboard and automatic navigation use that transition; none and
      reduced-motion change slides instantly.
108.  GIVEN Auto is on WHEN a slide has a duration THEN the deck advances after
      that delay; an untimed slide and the final slide pause without wrapping.
109.  GIVEN Presenter view is on WHEN the slide changes THEN its separate
      synchronized window shows the current preview, notes, elapsed/remaining
      timing and next preview while the audience window never contains notes.
110.  GIVEN a browser that reports native MP4 recording WHEN an animated
      document is exported as MP4 THEN every frame follows the chosen flipbook
      timing in a real `.mp4` container, narration is included when present,
      and browsers without support never show the MP4 option.
111.  GIVEN the default, Design, Play, slide-settings and Presenter surfaces
      in either theme WHEN their text and controls are measured THEN normal
      text, secondary labels and accent labels meet WCAG AA contrast.
112.  GIVEN an animated document with frame captions WHEN Vertical, Square or
      Landscape video is exported THEN the complete artwork is contained
      without cropping or stretching at 720p, captions are burned into their
      matching frames over a readable backing, the stream requests 30 fps while
      preserving the chosen flipbook timing, the filename names its shape, and
      one Undo removes the complete caption edit made in the export dialog.
113.  GIVEN the official OpenAI endpoint with image creation enabled WHEN no
      image model is entered and a picture is requested THEN the current GPT
      Image model receives a supported efficient draft request, no legacy
      response-format option is sent, and the returned picture fills Dream's
      exact canvas dimensions; a separately configured compatible endpoint
      continues to receive its requested model and canvas size.
114.  GIVEN an English, Arabic, Persian, Simplified Chinese, Brazilian
      Portuguese or Russian story WHEN it is planned THEN two to six numbered moments appear locally without an AI
      request or document mutation, and each moment can be edited, heard aloud,
      added, removed or regenerated from revised story words before
      confirmation; Little Dreamer dictation plans immediately and its
      storyboard actions speak their names.
115.  GIVEN a reviewed storyboard WHEN Make animation is confirmed THEN the
      active image-capable provider, or the visibly named built-in fallback,
      paints each moment in order with whole-story continuity instructions;
      no frame lands unless all pictures succeed, captions keep the reviewed
      moments, existing art is preserved, a new storyboard loops and plays at
      one frame per second, and one Undo removes the complete generated batch.
116.  GIVEN the global microphone WHEN “make a story about a moon adventure”
      or «اصنع لي قصة عن القمر» is spoken THEN the storyboard opens already
      planned from the trailing request, while “tell the story” remains the
      distinct narration action.
117.  GIVEN the adult shell at 1280 px width WHEN Story is present THEN Story,
      AI, voice, Undo, Redo, Little Dreamer and Settings remain visible without
      horizontal scrolling; narrower windows may scroll rather than dropping
      an action.
118.  GIVEN the first-run welcome card is still visible WHEN a storyboard
      succeeds THEN the card dismisses before the painted animation is shown
      and never obscures that result.
119.  GIVEN the private Presenter window WHEN Previous, Next or Auto is used
      there—or navigation happens in the audience window—THEN both windows stay
      on the same slide; Show audience brings that window forward, closing only
      the console leaves the show running, and Exit closes the session.
120.  GIVEN a browser blocks the Presenter window WHEN Presenter is requested
      THEN a friendly pop-up instruction appears on the audience stage without
      exposing speaker notes or interrupting navigation.
121.  GIVEN an adult animated document at 390 px width WHEN Animate, Slides or
      App is chosen in the timeline THEN frame thumbnails and
      add/duplicate/reorder/delete remain visible, only the selected job's
      controls appear, and App offers linking before links exist or preview
      afterward; wider layouts remain unchanged and Little Dreamer has no job
      chooser.
122.  GIVEN a small framed prototype WHEN Share app link is copied and opened
      in a fresh tab THEN the URL opens directly as the responsive standalone
      app at the authored start screen, with working keyboard-accessible
      hotspots and no editor chrome or network upload.
123.  GIVEN a shared prototype whose project has layers, hidden art, speaker
      notes, captions, narration, game or AI settings WHEN its viewer payload
      is inspected or opened THEN it contains only flattened PNG screens,
      valid hotspots, transitions, title, size and start screen; none of the
      private or editable project material is present.
124.  GIVEN a share payload that is damaged, unsafe, over 2 MB when expanded or
      would create a URL over 100,000 characters WHEN Dream handles it THEN it
      never executes supplied markup or overwrites work: an incoming bad link
      falls back to the editor with a friendly warning, and an outgoing large
      prototype is directed to the Interactive app file.
125.  GIVEN a multi-frame animation WHEN a start and end frame are chosen for
      WebM or MP4 THEN the shown duration, progress total and downloaded video
      cover that inclusive range only, while every source frame and its order
      remain unchanged and reopening Export defaults to the full animation.
126.  GIVEN a narration take and a trimmed video beginning after frame 1 WHEN
      it is exported THEN the take begins at the selected frame's matching
      time offset and ends with the video, keeping voice synchronized with the
      retained pictures.
127.  GIVEN captions are edited while a video range is trimmed WHEN Export is
      pressed THEN caption edits remain one undoable document change exactly as
      before; trimming itself adds no history entry.
128.  GIVEN Persian is chosen in Settings WHEN the workspace updates THEN every
      product string has a non-empty Persian value, the shell changes to `fa`
      and right-to-left without reload, the choice persists per user, and the
      Settings controls remain completely inside the viewport.
129.  GIVEN the Persian UI WHEN dictation or the global microphone is used THEN
      recognition listens in Iranian Persian; Persian commands cover the same
      creation, recovery, delivery and narration intents as English and Arabic,
      Persian story sequence words create local moments, Arabic-keyboard
      yeh/kaf variants match, and English commands still work.
130.  GIVEN the Brush's Calligraphy nib WHEN a mouse, touch or pen gesture runs
      along versus across its fixed 45° edge THEN the first mark is thin and the
      second broad; pen pressure further modulates the result, the live preview
      matches the committed mark, and one Undo removes the whole gesture.
131.  GIVEN the Text tool WHEN Persian script is selected THEN Persian text
      prefers an installed Nastaliq or Arabic-script face, remains editable
      until committed, and appears consistently in the canvas and exports.
132.  GIVEN Settings is open WHEN an automated accessibility scan inspects its
      form controls in either writing direction THEN they form one correctly
      labeled control group with no serious or critical violation.
133.  GIVEN the Line tool WHEN Arrow or Arrows both ways is selected and a
      non-zero line is drawn THEN its requested heads render at the correct
      endpoints, remain attached through supported transforms and save/load,
      and one Undo removes the complete connector.
134.  GIVEN the Text tool WHEN the canvas is clicked and science symbols are
      used THEN the text entry remains visible and focused after that click,
      first-run guidance no longer obstructs it, each symbol replaces the
      current selection or inserts at the caret, and typing can continue before
      one text commit.
135.  GIVEN an active canvas or frame containing only scalable visible marks
      WHEN SVG is exported THEN the file preserves its authored dimensions,
      background, layer and mark opacity, geometry, pressure-width strokes,
      deterministic spray, connector heads, text and XML-significant
      characters under the document-derived filename.
136.  GIVEN visible imported/generated pixels, baked pixel edits or eraser
      marks WHEN SVG is selected THEN Dream explains why scalable export is
      unavailable and disables only that Export action while PNG remains a
      working fallback; hiding all unsupported content makes SVG available.
137.  GIVEN comma- or tab-separated data with one header, a numeric horizontal
      column, one to four numeric measured series and 2–200 rows WHEN it is
      pasted into Plot data THEN quoted labels are decoded and the recognized
      row/series counts appear before any document change.
138.  GIVEN empty, uneven, non-numeric, unclosed-quote, over-five-column or
      over-200-row plot input WHEN it is reviewed THEN a corrective message
      names the constraint, Insert remains disabled and the document/history
      stay untouched.
139.  GIVEN valid data WHEN Line, Scatter or Bar is inserted THEN the figure
      uses rounded numeric axes, labeled ticks, a light grid and color-keyed
      legend; Line joins and marks samples, Scatter marks without joining, and
      grouped Bar includes a zero baseline.
140.  GIVEN an inserted plot WHEN any member is later selected, transformed,
      saved, animated or exported as SVG THEN its title, axes, grid, labels,
      series and data marks behave as one scalable group on one new layer; one
      Undo removes the complete insertion.
141.  GIVEN Simplified Chinese is chosen in Settings WHEN the workspace
      updates THEN every product string has a non-empty Chinese value, the
      document language becomes `zh`, layout remains left-to-right, and the
      choice persists without reload.
142.  GIVEN the Simplified Chinese UI WHEN dictation, spoken labels or the
      global microphone is used THEN recognition and speech request Mainland
      Mandarin and all feedback is Chinese where the browser supports it.
143.  GIVEN an unspaced Chinese command such as “请帮我撤销”, “填充红色”,
      “关闭镜像”, “玩迷宫”, “预览应用”, “导出真实代码” or “停止录音” WHEN
      it is heard THEN the matching recovery, creation, game, delivery or
      narration action occurs without colliding with adjacent intents; English
      commands continue to work.
144.  GIVEN a Chinese story with Chinese punctuation and sequence words WHEN
      it is planned locally THEN those moments split into two to six editable
      frames; a single idea receives natural Chinese beginning/next labels.
145.  GIVEN a Chinese game description WHEN it names a supported game,
      difficulty, speed, quantity, lives or Chinese-named layers THEN the
      visible template, settings and cast update deterministically without a
      network request.
146.  GIVEN Português (Brasil) is chosen in Settings WHEN the workspace
      updates THEN every product string has a non-empty Brazilian Portuguese
      value, the document language becomes `pt`, layout remains left-to-right,
      and the choice persists without reload.
147.  GIVEN the Brazilian Portuguese UI WHEN dictation, spoken labels or the
      global microphone is used THEN recognition and speech request Brazilian
      Portuguese and all feedback is localized where the browser supports it.
148.  GIVEN a Portuguese command such as “por favor, desfaça”, “preencher
      vermelho”, “desligar espelhamento”, “jogar labirinto”, “pré-visualizar
      meu app”, “exportar código real” or “parar gravação” WHEN it is heard
      THEN the matching recovery, creation, game, delivery or narration action
      occurs without adjacent-intent collisions; English commands still work.
149.  GIVEN a Brazilian Portuguese story WHEN sequence language such as
      “depois”, “em seguida” or “por fim” is used THEN two to six editable
      moments are planned locally; a single idea receives natural Portuguese
      beginning/next labels.
150.  GIVEN a Brazilian Portuguese game description WHEN it names a supported
      game, difficulty, speed, quantity, lives or Portuguese-named layers THEN
      the visible template, settings and cast update deterministically without
      a network request.
151.  GIVEN Русский is chosen in Settings WHEN the workspace updates THEN
      every product string has a non-empty Russian value, the document language
      becomes `ru`, layout remains left-to-right, and the choice persists
      without reload.
152.  GIVEN the Russian UI WHEN dictation, spoken labels or the global microphone
      is used THEN recognition and speech request Russian for Russia and all
      feedback is localized where the browser supports it.
153.  GIVEN a Russian command such as “пожалуйста, отменить”, “заливка
      красным”, “выключить отражение”, “играть в лабиринт”, “показать моё
      приложение”, “экспортировать настоящий код” or “остановить запись” WHEN
      it is heard THEN the matching recovery, creation, game, delivery or
      narration action occurs without adjacent-intent collisions; English
      commands still work.
154.  GIVEN a Russian story WHEN sequence language such as “затем”, “потом” or
      “наконец” is used THEN two to six editable moments are planned locally; a
      single idea receives natural Russian beginning/next labels.
155.  GIVEN a Russian game description WHEN it names a supported game,
      difficulty, speed, quantity, lives or Russian-named layers THEN the
      visible template, settings and cast update deterministically without a
      network request.
156.  GIVEN Brush is active WHEN Fine ink, Soft marker, Bold paint or
      Calligraphy is chosen THEN its documented size, opacity and tip become
      visible together, only the matching preset is selected, manual adjustment
      clears that selection, existing marks stay unchanged, and future marks
      use the new settings.

## K. The ten end-to-end scenarios (persona proofs)

1. **Zainab (5):** kid mode on → say «اصنع لي قصة عن القمر» → hear the two
   planned moments aloud → confirm → the painted, captioned flipbook plays →
   one Undo removes the whole story → stamp a rocket → say "play my game" →
   the rocket catches stars.
2. **Victor (85):** comfort mode on → everything bigger and calmer →
   draw → undo → save → reopen tomorrow: the drawing is there.
3. **Ali (30):** choose a brush preset → stylus pressure strokes → layers → import a photo →
   Vintage preset → crop → export JPEG q92.
4. **Fatima (21):** Persian UI → full RTL → choose the Calligraphy nib →
   draw thick/thin lettering with mirror symmetry on → add Persian-script
   text → one undo removes the whole mirrored bloom.
5. **George (45):** voice-first: "make an animation with a red bird that finds
   home" → hear and confirm the planned moments → the complete animation plays
   → "record narration" → tell it aloud → "stop recording" → "save".
6. **Sara (15):** Design mode → draw logo elements → align/distribute →
   save as component → new project → insert the component → export SVG.
7. **Zǐxuān (28):** switch to 简体中文 → paste experiment data → insert a
   grouped line plot → annotate it with a reversible-reaction connector,
   chemical subscripts and symbols → export a scalable SVG → duplicate frames
   to animate the result → link explanatory screens into an app.
8. **Maria (32):** switch to Português (Brasil) → export `.dream` → agent reads
   it, adds a layer with a shape and text, renders a PNG, exports the app HTML
   via the dream-mcp tools → re-import the `.dream` unchanged elsewhere.
9. **Aleksandr (25):** switch to Русский → keyboard-only: tool keys, marquee,
   snap-align, Cmd+D, nudge, group — a full layout without touching the mouse.
10. **Ahmed (42):** draw a scene per frame → record narration → add readable
    frame captions → export a vertical 9:16 WebM or native MP4 → the complete
    artwork, voice and captions play on a friend's phone.

## L. Visual & feel checkpoints

- The mark: gradient squircle, white crescent, white four-point sparkle —
  at 28/56/84 px.
- The signature gradient (indigo → violet → rose, 135°) on the title and
  primary buttons; calm neutral surfaces; the canvas sits on a darker
  surround so artwork pops.
- Dialogs fade-and-scale in; the mode pill slides; ambient drift behind
  the canvas; splash pulse — all transform/opacity-only, all gone under
  reduced-motion.
- Focus rings always visible; tooltips styled with name + shortcut (never
  in kid mode); touch targets ≥ 44 px in comfort mode.
- Dark theme: every token remapped, nothing hardcoded; tooltip inverts.
- Status bar reads pointer position, document size, active tool, zoom —
  tabular figures.
- The game stage and presentations letterbox on `#10131a` at 94% fit.
- It should feel like MS Paint's first minute and Photoshop's tenth year —
  and a child should smile at the bleeps.
