# Dream persona and UX audit

**Audit date:** 2026-08-04
**Standard:** strict readiness against the human intent in the product vision,
not merely the presence of a named control.

## Executive verdict

- **10/10 persona readiness: 0 of 10.** Dream provides credible end-to-end
  outcomes for every persona, but “the example task can be completed” is not a
  10/10 standard. The stricter bar includes the underlying job, expected quality,
  constraints, emotional need, recovery, and delivery into the person's real
  next context.
- **Contract parity: provisional, not self-certifying.** The previous audit
  called parity complete while deployed tooltips were clipped, AI selection was
  discoverable only through prior mode knowledge, and the voice contract
  contradicted the product's no-dead-ends rule. Those gaps are corrected in the
  current release candidate and covered in a production-browser gate; parity is
  claimed only after the full release gates and deployed proof pass.
- **Principal UX verdict: the architecture is strong; interaction quality and
  professional depth are not yet universal.** Progressive disclosure,
  local-first trust and exact undo are excellent foundations. Natural voice,
  literacy-optional delivery, direct-manipulation feedback, non-destructive
  professional editing and outcome-grade export remain the largest gaps.

## Evidence and method

The audit covers the entire product idea, living spec, product roadmap,
automated test inventory, and rendered desktop and phone states. It also
benchmarks the personas' real contexts against current accessibility,
professional art/design, scientific-publishing, agent-protocol and short-video
expectations. A score is earned only when five layers hold together:

1. **Functional job:** the literal outcome can be completed end to end.
2. **Human constraint:** age, literacy, language, input device, connectivity and
   confidence are respected without a helper.
3. **Quality bar:** the result is credible in the person's real professional,
   educational, client or advocacy context.
4. **Control and trust:** state is visible, errors are recoverable, long work
   explains its progress, and export does not surprise.
5. **Emotional outcome:** the person feels capable and expressive—not patronized,
   blocked by jargon or forced into a workflow built for somebody else.

A 10/10 means the person would choose Dream for this job, finish without hidden
workarounds, trust the result, and enthusiastically recommend it to someone with
the same need.

## Persona 10/10 evaluation

Scores describe today's release candidate against the latent 10/10 job, not
against the much smaller question “does a related feature exist?”

| Persona       | Underlying intent and 10/10 expectation                                                                                                                                                           | Current strengths                                                                                                                                                             | What prevents a 10/10                                                                                                                                                                                         | Score |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----: |
| Zainab, 5     | Feel creative and powerful without reading or adult help: talk naturally, see a safe delightful story with consistent characters, change it, play it immediately, and recover every accident.     | Little Dreamer, spoken names, reviewed voice story, basic spoken object corrections, starters, four games, one-step Undo.                                                     | Voice is still command-shaped and browser-dependent; the offline painter cannot faithfully create arbitrary characters; no child-safety/guardian controls or real-child validation.                           |   5.5 |
| Victor, 85    | Express an idea with dignity and confidence despite possible vision, tremor or memory limits; never fear losing work or wonder what mode/tool is active.                                          | Comfort mode, contrast, 44 px targets, reduced motion, autosave, exact Undo.                                                                                                  | Comfort is hidden behind Settings; the adult shell is dense; no tremor stabilization, guided first journey, persistent task orientation, or manual assistive-technology proof.                                |   5.5 |
| Ali, 30       | Preserve the feel of real media while gaining digital control, speed and production trust: expressive input, deep brushes, non-destructive experimentation, calibrated color and reliable output. | Pressure, calligraphy, presets, layers, raster editing, selection, AI edits, PNG/JPEG.                                                                                        | No tilt/azimuth, stabilization, custom brush dynamics, blend modes, masks, adjustment layers, color profiles, soft proofing, large-canvas performance proof or professional interchange.                      |   4.0 |
| Fatima, 21    | Explore calligraphy authentically in her own language and direction, controlling the nib and composition precisely while keeping work suitable for high-quality sharing or print.                 | Persian RTL, regional speech, broad nib, pressure, symmetry, Persian text, scalable native marks.                                                                             | Fixed nib angle, no pen tilt/rotation, path refinement, calligraphic guides, OpenType/font controls, custom brush creation, print color or high-resolution publication workflow.                              |   5.0 |
| George, 45    | Turn a feeling into an understandable moving story on a new phone with little reading, weak technical vocabulary and minimal setup; share it confidently with family.                             | Task-first phone creation shell, direct Select, spoken labels, story planning, basic spoken object corrections, narration, games, touch, offline shell, recoverable creation. | Natural conversation stops at bounded intents; panel controls and export remain text-heavy; speech availability, generated visual fidelity and sharing handoff are not resilient enough.                      |   4.0 |
| Sara, 15      | Earn trust and income: create a distinctive logo quickly, revise it from client feedback, keep typography/colors precise, and deliver every professional file without embarrassment.              | Selection/layout, components, layers, honest SVG and one-click multi-size brand pack.                                                                                         | No vector-node editing, typography depth, transparent-background workflow, grids, brand colors/tokens, variants, PDF/print/CMYK delivery or client-review loop.                                               |   5.0 |
| Zǐxuān, 28    | Communicate science accurately and publishably: preserve data integrity, build editable accessible figures/animations, use domain notation, and meet journal/export requirements.                 | Native grouped plots, scientific text/connectors, SVG, animation, app links, Chinese journey.                                                                                 | No units/error bars/log scales/fits, chemical structures, color-blind palette checks, scale bars, provenance, image-integrity record, editable PDF/EPS, DPI/physical sizing or publication preflight.         |   4.0 |
| Maria, 32     | Let agents reliably read, create, revise, render and ship real design assets inside coding workflows with typed contracts, transparent side effects and easy installation.                        | Portable `.dream`, stable engine, local MCP tools for read/render/export, layers, strokes, shapes/text.                                                                       | Package not publicly installable; no raster/AI/link/component authoring, resources/prompts, output schemas, side-effect annotations, progress/cancellation, remote API/SDK or complete round-trip eval.       |   3.5 |
| Aleksandr, 25 | Move at professional thought speed: direct manipulation, precise inspectors, reusable systems, responsive layout, powerful shortcuts, extensibility and polished handoff without tool friction.   | Predictive pointer/drag states and previews, keyboard workflows, snapping/alignment, groups/components, layers, localized UI, batch delivery.                                 | No vector paths, auto layout/constraints, variables/tokens, linked components/variants, grids/rulers, multi-page organization, extensibility or inspector depth.                                              |   4.0 |
| Ahmed, 42     | Turn testimony into emotionally compelling, legible, platform-ready short video while protecting authorial intent and sharing quickly from constrained devices.                                   | Flipbook, narration, captions, shaped WebM/MP4, trimming, presentation and private/offline sharing.                                                                           | No audio mix/music, caption timing/styles, scene-duration timeline, transitions for video, safe-zone preview, compression/size target, direct share/upload, thumbnail/cover workflow or long-project editing. |   5.0 |

The average is **4.6/10**. That is not a dismissal of the shipped breadth; it
is a refusal to confuse breadth with completion.

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
20. **Delivery should be task-sized and truthful.** A client handoff is one
    named ZIP rather than several browser-blockable downloads. Exact raster
    sizes are stated before export, aspect and appearance remain intact, and
    SVG joins only when it is genuinely scalable.
21. **Agent edits need the same structural guardrails.** Layer management uses
    the active stack, stable ids or names, explicit zero-based order and bounded
    opacity. Bad targets write nothing, animation mirrors remain coherent and
    the final layer cannot be removed.
22. **Generative identity must be true at the action point.** A bounded offline
    scene maker says what themes it understands. Choosing an own-AI provider
    stays visibly pending until Save and disables creation, while returning to
    an already configured provider takes effect immediately. A prompt can no
    longer appear to target one provider while another silently handles it.
23. **Agent drawing should remain ordinary Dream drawing.** Freehand authoring
    persists the same bounded points, pressure widths, colors and opacity rules
    as direct pen input. It adds no agent-only visual primitive, and malformed
    paths fail before changing the portable project.
24. **Discoverability must be rendered, not inferred from markup.** The tooltip
    audit found labels reaching their visible CSS state while scrolling parents
    clipped every pixel. Tooltips now escape toolbar and rail boundaries, and a
    browser gate checks the actual anchored state.
25. **A cross-mode prerequisite needs a direct route.** AI Edit now distinguishes
    whole-layer behavior from selected-part behavior and can enter Design +
    Select in one action. The user no longer has to reverse-engineer two modes
    before using a checkbox already in front of them.
26. **Voice cannot silently cease to exist.** The global mic stays visible when
    recognition is absent, explains the remaining input paths and can speak that
    explanation in Little Dreamer. A browser test proves both unavailable and
    successful spoken-story paths.
27. **The pointer should make a promise before the press.** Select now previews
    the exact topmost hit; object, resize, pan, move, zoom, locked and active-drag
    cursors distinguish outcomes. Image/component drags receive named valid
    targets and unsupported content receives a named refusal before release.
28. **A phone toolbar should express priority, not desktop order.** Story, AI,
    voice, Undo, Settings and the four workspaces keep stable visible homes at
    390 px. Secondary file, animation and setup commands move into one labelled
    two-column More tray that stays inside the viewport, closes after action,
    restores focus on Escape and preserves comfort targets.
29. **Phone depth should be disclosed, never deleted.** A bottom dock preserves
    the current tool, common tools and direct Design selection without reducing
    canvas width. All tools and Controls expose the complete eligible palette
    and every applicable panel in labelled, dismissible sheets; the visible AI
    button now opens a visible AI destination instead of a hidden sidebar.

### What does not yet fully serve the purpose

1. **Literacy-optional is not universal yet.** Story-to-animation proves that
   an outcome-level command, spoken confirmation labels and read-aloud review
   can carry a complex creation journey. Project management, Design, advanced
   editing and most export choices still depend on reading and need the same
   treatment where personas require it.
2. **Mobile creation is task-first; literacy-optional depth and delivery are not
   yet.** The phone shell, tool dock and timeline preserve canvas space,
   orientation, direct selection, complete tool access and advanced panels
   without sideways scanning. Those panels and export choices still demand too
   much reading and precision from George's one-handed journey.
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
6. **Voice has useful object context, but is not yet conversational.** Natural
   size, color, deletion, duplication and basic position phrases now resolve
   “it” to visible selected artwork, preserve brush meaning where appropriate
   and never turn “delete it” into a whole-layer clear. Spoken directions nudge
   predictably, center the selection or place it at a named canvas edge; mixed
   spoken corrections no longer disappear behind a leading yes/no, and one-turn
   “again” safely continues a nudge. Relationships between objects, broader
   multi-turn clarification and repair, and offline recognition are not present.
7. **Direct manipulation now has a foundation, not full depth.** Predictive hit
   chrome, contextual cursors, open/closed-hand drags, named drop targets and
   post-component-drop selection, compact pointer ghosts and exact-scale
   component placement previews, a named keyboard/pointer Insert alternative
   and angle/constraint feedback during rotation are coherent. Selection snaps
   now combine the existing exact guide with compact pointer-side and optional
   tactile confirmation. Multi-item progress remains.
8. **Long-work control has begun, but is not yet consistent.** Create, Edit,
   Feedback and provider connection tests now show honest staged activity,
   allow immediate cancellation and reject late results. Story creation and
   video export have useful step counts and immediate cancellation; Story also
   names the active moment, marks completed moments and rejects partial or late
   batches, while video stops its recorder/audio mix and refuses partial
   downloads without losing caption edits. Real Code names preparation, writing
   and verification, allows immediate cancellation and rejects late downloads.
   Saved and portable project opening names reading, restoration and a longer
   wait, allows immediate cancellation, preserves current work and rejects late
   loads. Meaningful partial-state placeholders remain future work where an
   operation can safely expose partial output.
9. **Tactile feedback now has a sparse foundation.** On supported touch devices,
   optional short cues reinforce the first visible valid drop target and a
   visible refusal, rotation steps and newly entered selection guides, remain
   silent under reduced motion and never buzz while drawing or continuing along
   one guide. Destructive refusal and game collisions are not yet covered and
   must follow the same causal, redundant contract.
10. **Professional outcomes need professional substrate, not isolated tools.**
    Non-destructive masks/adjustments, vector paths, typography/color systems,
    publication preflight and richer agent schemas unlock several personas at
    once; adding more decorative presets does not.

## Recommended order

1. **P0 — truth and control:** deploy the tooltip, selection and visible voice
   fixes; keep real-browser gates for every reported failure.
2. **P1 — Zainab + George:** extend the now task-first phone shell into genuinely
   conversational creation, visible clarification, literacy-light phone controls
   and export, and a faithful child-safe creation path that does not require
   BYOK setup.
3. **P1 — interaction foundation:** complete cursor semantics, hover/hit feedback,
   drag previews and drop targets; make long tasks explain progress and support
   safe cancellation; add sparse optional haptics only after visual behavior is
   exact.
4. **P1 — professional substrate:** non-destructive masks/adjustments, blend and
   color foundations, vector paths, typography, grids/constraints and linked
   reusable systems—progressively disclosed in Design, never added to Draw.
5. **P1 — outcome delivery:** publication-grade scientific export and integrity,
   professional brand/print delivery, and a short-video audio/caption/safe-zone
   workflow.
6. **P1 — Maria:** finish typed MCP coverage, structured outputs and side-effect
   annotations; publish the prepared package only after explicit approval.
7. Validate language, child, older-adult, screen-reader, switch-control and pen
   journeys with representative real users. Automated checks remain the floor.

This audit is a release decision aid, not part of the product specification.
It may name current implementation evidence and future options; the living spec
remains decoupled and describes only shipped product behavior.
