# Dream persona and UX audit

**Audit date:** 2026-08-03
**Standard:** strict readiness against the human intent in the product vision,
not merely the presence of a named control.

## Executive verdict

- **Living-spec parity: PASS — zero known behavior delta.** The complete
  product spec was checked against the shipping behavior, data contracts,
  interaction map and test surface. Gaps found during the audit were corrected:
  presentation behavior was added across the feature, experience, schema and
  acceptance contracts; the AI storage contract now includes the edits model;
  narration is named as outside undo; and `.dream` forward compatibility now
  distinguishes document content from disposable envelope extensions.
- **Persona readiness: 7 of 10 fully ready, 3 partially ready.** Dream already
  gives every persona a credible path, but the universal “anyone” promise is
  stricter than a feature checklist. The largest gaps are broader professional
  art/design depth and a publicly installable agent surface.
- **Principal UX verdict: strong product architecture, incomplete universal
  usability.** Progressive disclosure, local-first trust and universal undo are
  excellent foundations. The phone timeline and presenter privacy now follow
  their users' real tasks; mobile top-bar density, uneven voice reach and
  advanced-workflow discoverability still keep the experience from fully
  serving the stated 5-to-95, literacy-optional ambition today.

## Evidence and method

The audit covered the entire living spec (vision, concepts, interaction map,
all feature areas, visual identity, integrations, all data contracts and all
156 acceptance criteria), the product roadmap/research backlog, the automated
test inventory, and rendered desktop and phone states. A persona passes only
when their intended outcome is realistically achievable end to end with a
suitable input method and usable output—not when an adjacent feature exists.

## Persona readiness

| Persona       | What works now                                                                                                                                                              | Strict gap                                                                                                                                                                               | Verdict   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Zainab, 5     | Little Dreamer mode, large visual tools, spoken names, starter scenes, four gentle games, and spoken-story → reviewed, read-aloud animation                                 | No blocking gap for her stated cute-animation-and-game outcome: dictation plans automatically, actions speak their names and one confirmation creates the complete recoverable story     | **Ready** |
| Victor, 85    | Comfort mode, stronger contrast, 44 px targets, plain drawing, undo, autosave/reopen and reduced motion                                                                     | No blocking outcome gap for his stated goal; the adult toolbar remains dense, but Draw plus comfort mode provides a complete imagination-to-saved-canvas journey                         | **Ready** |
| Ali, 30       | Four transparent brush presets, stylus pressure, layers, image import, filters, crop/resize, selection masks, generative editing and lossless PNG/JPEG                      | Professional art depth remains thin: no tilt, custom brush engine, blend modes, non-destructive masks/adjustments or color-management workflow                                           | Partial   |
| Fatima, 21    | Complete Persian RTL UI, Iranian Persian speech/commands/story planning, a directional broad calligraphy nib, stylus pressure, symmetry and Persian-script text             | No blocking gap for her stated calligraphy-exploration outcome: mouse, touch or pen can make authentic thick/thin marks, mirrored work remains one-step recoverable and PNG preserves it | **Ready** |
| George, 45    | Spoken labels, forgiving English voice, story-to-reviewed-animation, read-aloud moments, narration, saving and games on touch devices                                       | No blocking gap for his stated spoken-animation outcome. On a phone he sees one timeline job at a time and can create, review, play, narrate and save without assembling frames by hand  | **Ready** |
| Sara, 15      | Design mode, selection, snapping, align/distribute, groups, reusable components, honest scalable SVG, PNG/JPEG and private prototype links                                  | No blocking gap for her stated freelance-logo outcome: she can construct, reuse, align and deliver a genuinely scalable logo; PDF and brand-export presets would make delivery smoother  | **Ready** |
| Zǐxuān, 28    | Complete Simplified Chinese UI/voice/story/game language; native data plots, scientific notation/connectors, precise layout, scalable SVG, animation and app links          | No blocking gap for his stated science-image/animation/app outcome: he can create and deliver the complete journey in Chinese; structure drawing and statistics remain specialist depth  | **Ready** |
| Maria, 32     | Complete Brazilian Portuguese UI/voice/story/game language; portable `.dream`, stable engine surface, local MCP reading/rendering/export and deterministic app/code exports | The MCP package is registry-ready but not publicly installable; agent editing lacks strokes, raster import, layer management, links, components and AI edits                             | Partial   |
| Aleksandr, 25 | Complete Russian UI/voice/story/game language; keyboard shortcuts, marquee/lasso, snapping, align/distribute, grouping, components, layers and reusable assets              | Productivity stops short of a broad professional design tool: no vector paths, symbols/linked components, constraints, batch export, grids or extensibility                              | Partial   |
| Ahmed, 42     | Draw-to-animation, narration, shaped/trimmed WebM or native MP4, burned-in captions, presentations, private links and offline app files                                     | No blocking gap for his stated draw → animate → social-video outcome; direct platform publishing could shorten delivery but is not required to produce and share the finished video      | **Ready** |

## Principal UX review

### What serves the purpose well

1. **Progressive disclosure is structurally right.** Draw stays approachable;
   Design, Play and Present reveal distinct kinds of depth without turning the
   first canvas into a cockpit.
2. **Recovery and trust are unusually strong.** Document edits share one exact
   undo history; mode/playback preferences do not “teleport” on undo; projects
   are local-first and AI key handling is explicit.
3. **Transformation has emotional payoff.** Casting a drawing into a game,
   narrating an animation and linking frames into an app make the canvas feel
   alive without requiring code.
4. **Accessibility is designed as product behavior.** Kid and comfort modes,
   RTL, reduced motion, feature-detected speech/audio and friendly failure paths
   are integrated rather than bolted on.
5. **Presentation settings use a good mental model.** Transition belongs to the
   slide being entered; an absent duration means manual; mixed timed/manual
   decks pause predictably; one Save and one Undo cover the complete slide edit.
6. **Social export preserves authorial intent.** Shape presets never crop or
   stretch the drawing, captions are visibly distinct from private speaker
   notes, and one batch edit is recoverable with one Undo.
7. **Outcome-level voice now earns trust before acting.** A spoken story becomes
   a visible bilingual plan, every moment can be heard or changed, provider and
   frame count are disclosed, failure is non-destructive, and one Undo removes
   the successful batch. This is the right confirmation model for generative
   work with children and low-literacy users.
8. **Presenter privacy matches the real-world mental model.** Notes, current and
   next previews, elapsed/remaining time and controls live in a synchronized
   second window; the audience stage stays clean, and popup failure never falls
   back to exposing private content.
9. **The phone timeline now follows intent instead of architecture.** Frames
   and their editing actions remain stable while Animate, Slides and App each
   reveal one coherent control set. The three choices fit at 390 px, App ends
   in one large next action, and Little Dreamer avoids the extra decision.
10. **Sharing preserves the trust promise.** A small prototype becomes one
    direct viewer link, but the transport contains only flattened screens and
    hotspots. Private notes and editable project structure are excluded by
    design, oversize work gets an honest file fallback, and hostile fragments
    are validated as data rather than executed as markup.
11. **Video trimming respects the source and the story.** Start/end frames are
    delivery choices, never destructive edits; duration and progress update
    immediately, and narration advances to the same frame-time offset instead
    of restarting against the wrong picture.
12. **Persian is an outcome path, not a translated shell.** The full RTL
    workspace, region-correct speech, complete command vocabulary, local story
    planning, broad-nib dynamics and Persian typography work together. The
    rendered pass also caught Settings leaving the viewport after an RTL
    switch; its fixed logical placement and honest form semantics now preserve
    the path that enables the locale in the first place.
13. **Scalable delivery is honest and task-sized.** Diagram and logo creators
    get arrow connectors, caret-aware scientific notation and real SVG without
    being pushed into a separate vector-editor mode. When visible pixels or
    erasure cannot remain vector, Dream disables only that action, explains
    why and keeps PNG available. A rendered review also caught and corrected
    the text field disappearing during its own placement click and onboarding
    copy obscuring the writing surface.
14. **Data becomes art without a mode trap.** A scientist pastes the small
    table they already have, sees exactly what was recognized and gets a clean
    plot as the same grouped marks used everywhere else. The dialog makes
    limits explicit, never guesses missing values or claims statistical
    analysis, and the rendered result uses rounded axes, a quiet grid and a
    genuinely color-keyed legend. It remains one-step recoverable and SVG-ready.
15. **A locale must reach the outcome, not just Settings.** Simplified Chinese
    covers every surface, requests the right speech language, understands
    natural unspaced commands, plans stories and games locally, and reaches the
    scientific plot journey in a real browser. English remains an additive
    recovery vocabulary instead of replacing Mandarin.
16. **Professional localization must preserve concepts.** The Brazilian
    Portuguese review caught “cast layers” mistranslated as “scale layers” and
    replaced literal art vocabulary before it reached users. The final journey
    covers project/code delivery, voice, stories and games—not just labels.
17. **Localized productivity includes input habits.** Russian reaches Design
    with its familiar vocabulary and keeps mode-aware keyboard shortcuts
    working unchanged. Common case forms are accepted in spoken commands, so
    localization does not force unnatural keyword grammar.
18. **Long labels must not hide recovery.** The rendered Russian workspace
    exposed that a single scrolling toolbar could push Undo and Settings out of
    view. File and creation actions now scroll in their own region while Story,
    AI, voice, recovery, Little Dreamer and Settings stay anchored.
19. **Presets should teach, not conceal.** Professional brush starting points
    change the same visible size, opacity and tip controls users already know.
    Manual adjustment clears the selected state, so convenience never becomes
    hidden state or a second brush system.

### What does not yet fully serve the purpose

1. **Literacy-optional is not universal yet.** Story-to-animation proves that
   an outcome-level command, spoken confirmation labels and read-aloud review
   can carry a complex creation journey. Project management, Design, advanced
   editing and most export choices still depend on reading and need the same
   treatment where personas require it.
2. **Mobile creation is improved, but the top shell is still desktop-shaped.**
   The phone timeline now prioritizes tasks and fits all three choices without
   overflow, but the adult top toolbar still scrolls horizontally. Its most
   common creation and recovery actions need a phone-native priority model.
3. **Advanced depth is discoverable mainly by mode labels and panels.** New
   users can miss components, links, AI selection editing and export variants.
   Lightweight contextual invitations should appear after relevant actions and
   disappear permanently once learned.
4. **Accessibility assurance now has an automated floor, not a ceiling.** Draw,
   Design, Play, slide settings, Presenter and every phone timeline task clear
   serious/critical browser scans after the audit corrected six contrast
   failures. Manual screen-reader, switch-control and complete dialog focus
   testing still need real users and dedicated coverage.
5. **Scientific creation is useful but not a statistics or chemistry suite.**
   Small numeric tables now become publication-shaped native plots, but Dream
   deliberately does not run statistical tests, infer missing values, import
   specialist project files or draw chemical structures from notation.

## Recommended order

1. Add batch/brand delivery where Sara or Aleksandr's real workflows justify
   the complexity.
2. Publish the prepared MCP package only with explicit approval, then deepen
   authoring tools in the order real agent workflows require.
3. Validate the now-complete language journeys with native speakers and test
   the highest-risk screen-reader and switch-control paths with real users.

This audit is a release decision aid, not part of the product specification.
It may name current implementation evidence and future options; the living spec
remains decoupled and describes only shipped product behavior.
