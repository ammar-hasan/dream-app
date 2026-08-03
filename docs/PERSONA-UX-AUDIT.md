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
- **Persona readiness: 2 of 10 fully ready, 8 partially ready.** Dream already
  gives every persona a credible path, but the universal “anyone” promise is
  stricter than a feature checklist. The largest gaps are voice-to-animation,
  language/calligraphy depth, scientific illustration, professional vector
  output and a publicly installable agent surface.
- **Principal UX verdict: strong product architecture, incomplete universal
  usability.** Progressive disclosure, local-first trust and universal undo are
  excellent foundations. Mobile density, voice reach, advanced-workflow
  discoverability and presenter privacy keep the experience from fully serving
  the stated 5-to-95, literacy-optional ambition today.

## Evidence and method

The audit covered the entire living spec (vision, concepts, interaction map,
all feature areas, visual identity, integrations, all data contracts and all
113 acceptance criteria), the product roadmap/research backlog, the automated
test inventory, and rendered desktop and phone states. A persona passes only
when their intended outcome is realistically achievable end to end with a
suitable input method and usable output—not when an adjacent feature exists.

## Persona readiness

| Persona       | What works now                                                                                                                                  | Strict gap                                                                                                                                                                         | Verdict   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Zainab, 5     | Little Dreamer mode, large visual tools, spoken names, prompt dictation, starter scenes, four cast-your-drawing games and gentle controls       | Voice can prepare a game and control frames, but cannot turn one spoken story into a complete cute animation; several creation/export journeys still require reading               | Partial   |
| Victor, 85    | Comfort mode, stronger contrast, 44 px targets, plain drawing, undo, autosave/reopen and reduced motion                                         | No blocking outcome gap for his stated goal; the adult toolbar remains dense, but Draw plus comfort mode provides a complete imagination-to-saved-canvas journey                   | **Ready** |
| Ali, 30       | Stylus pressure, layers, image import, filters, crop/resize, masks through selection, generative editing, lossless PNG and JPEG quality         | Professional art depth remains thin: no tilt, brush library, blend modes, non-destructive masks/adjustments or color-management workflow                                           | Partial   |
| Fatima, 21    | RTL shell, symmetry modes, pressure drawing, precise transforms, text and image editing                                                         | Arabic is not Persian; calligraphy lacks purpose-built nib dynamics, path lettering and Persian typography. Raster-only output limits scalable calligraphic work                   | Partial   |
| George, 45    | Visual tools, spoken labels, forgiving English voice commands, offline animation, narration and games on touch devices                          | Voice controls an animation but does not create the dreamed sequence from his description. The adult animation timeline is still visually dense for a new, low-literacy phone user | Partial   |
| Sara, 15      | Design mode, selection, snapping, align/distribute, groups, reusable components and PNG/JPEG export                                             | Freelance logo delivery normally needs scalable vector/SVG or PDF output and cleaner brand-export presets; Dream is currently raster-first                                         | Partial   |
| Zǐxuān, 28    | Shapes/text, precise layout, animation, presentations, prototypes, app export and agent-readable projects                                       | No chemistry/scientific notation, connectors, diagrams, grids, plot/data import or publication-ready vector export                                                                 | Partial   |
| Maria, 32     | Portable `.dream`, stable engine surface, local MCP reading/rendering/export plus layer/shape/text authoring, deterministic app/code exports    | The MCP package is registry-ready but not publicly installable; agent editing lacks strokes, raster import, layer management, links, components and AI edits                       | Partial   |
| Aleksandr, 25 | Keyboard shortcuts, marquee/lasso, snapping, align/distribute, grouping, components, layers and reusable assets                                 | Productivity stops short of a broad professional design tool: no vector paths, symbols/linked components, constraints, batch export, grids or extensibility                        | Partial   |
| Ahmed, 42     | Draw-to-animation, narration, Vertical/Square/Landscape WebM or native MP4, per-frame burned-in captions, presentations and offline app sharing | No blocking gap for his stated draw → animate → social-video outcome; trimming and direct publishing would make the workflow more professional but are not required to deliver it  | **Ready** |

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

### What does not yet fully serve the purpose

1. **Presenter view is not truly private.** Notes are a toggleable in-window
   panel over the stage. It works for rehearsal and a single-device talk, but a
   projected audience sees the panel too. A separate synchronized presenter
   console with next-slide preview, elapsed/remaining time and audience-window
   control is the correct end state.
2. **The frame timeline carries several mental models.** Animation controls,
   video captions, slide settings and app-link discovery share one dense strip. The reuse is
   architecturally elegant but cognitively expensive, especially on phones.
   Contextual grouping or a mode-sensitive secondary row should preserve the
   shared frame model without showing every interpretation at once.
3. **Literacy-optional is not end-to-end.** Voice and spoken names cover many
   atomic actions, but multi-step creation, project management, Design and
   export still depend on reading. Voice needs outcome-level commands and
   guided confirmations, not only tool-level verbs.
4. **Mobile is supported, not yet mobile-first.** Presentation controls fit at
   phone width after the slice-24 correction, but the adult shell and timeline
   remain dense and horizontally demanding. The product needs task-prioritized
   mobile chrome rather than desktop controls that scroll.
5. **Advanced depth is discoverable mainly by mode labels and panels.** New
   users can miss components, links, AI selection editing and export variants.
   Lightweight contextual invitations should appear after relevant actions and
   disappear permanently once learned.
6. **Accessibility assurance now has an automated floor, not a ceiling.** Draw,
   Design, Play, slide settings and Presenter clear serious/critical browser
   scans after the audit corrected six contrast failures. Manual screen-reader,
   switch-control and complete dialog focus testing still need real users and
   dedicated coverage.

## Recommended order

1. Build voice-to-storyboard animation planning for Zainab and George, using
   only visible, confirmable frame actions.
2. Split Presenter into synchronized audience and presenter windows.
3. Redesign the phone timeline around the active task (Animate, Present or App).
4. Add direct shareable publishing and lightweight trimming after validating
   Ahmed's now-complete shaped-caption export with real storytellers.
5. Add Persian first, then persona-relevant Chinese, Portuguese and Russian;
   pair Persian with calligraphy-specific input and typography.
6. Add a focused scientific-diagram toolset and scalable export rather than a
   general-purpose vector editor all at once.
7. Publish the prepared MCP package only with explicit approval, then deepen
   authoring tools in the order real agent workflows require.

This audit is a release decision aid, not part of the product specification.
It may name current implementation evidence and future options; the living spec
remains decoupled and describes only shipped product behavior.
