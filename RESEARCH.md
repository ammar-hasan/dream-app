# Dream — Research (v0.1.0 release-day edition)

Prepared: 2026-08-03

This document collects the competitive landscape, UX research digest, trend
watch, prioritized backlog, and positioning that informed the v0.1.0 release
of Dream.

## 1. Competitive landscape

| Product                            | Standout features                                                                                                                                         | What Dream has                                                                    | Gap / opportunity                                                                                                     | Source                                                                                                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MS Paint (Copilot)**             | Generative fill/erase, image creator, background removal built into the default Windows paint app; the "everyone's first editor" now ships AI by default  | Simple immediate canvas, kid-first UX, AI built in                                | Dream must beat Paint's new AI baseline while staying simpler than Paint's growing ribbon                             | https://windowslatest.com/ (Paint Copilot hub)                                                                                                                         |
| **BioRender Graphing**             | Raw CSV/Excel/Prism import, automatic variable detection, line/box and other plots, guided analysis, editable labels/axes and publication-oriented output | Scientific connectors/notation, grouped native marks, animation/apps and SVG      | A small paste-to-native-plot path closes the communication gap without pretending Dream is a statistics package       | https://www.biorender.com/product/graphing · https://www.biorender.com/blog/graphing-and-statistical-analysis                                                          |
| **Canva (Magic Studio)**           | Magic Design/Write/Media, brand kits, one-click resize, massive template library; the template-first workflow for non-designers                           | Free, offline, no account; drawing-first rather than template-first               | Template/starter galleries and coloring pages are Dream's entry point to the Canva audience                           | https://www.shopify.com/blog/how-to-use-canva-ai                                                                                                                       |
| **Figma (AI / FigJam)**            | First Draft generates editable UI from a prompt; multiplayer canvas; the professional design default                                                      | App mode (hotspots, links), HTML prototype export, Play mode                      | "Make real" code export and conversational generation close the prompt-to-app gap for non-designers                   | https://help.figma.com/ (First Draft article)                                                                                                                          |
| **Figma / Illustrator delivery**   | Fixed-dimension or scaled exports; Illustrator batches assets across multiple sizes and formats in one action                                             | Exact raster rendering and truthful SVG classification                            | One focused ZIP can cover repeatable client handoff without importing a professional asset-export cockpit             | https://help.figma.com/hc/en-us/articles/13402894554519-Export-formats-and-settings · https://helpx.adobe.com/illustrator/using/collect-assets-export-for-screens.html |
| **Adobe Express / Firefly**        | Firefly generative models across Express/Photoshop; Firefly Max 2025 bundles; commercially-safe generative fill                                           | BYOK AI providers, MockAIProvider free tier, generative features feature-detected | Generative fill/inpainting via BYOK is Dream's answer without subscription lock-in                                    | https://economictimes.indiatimes.com/ (Adobe Firefly Max 2025)                                                                                                         |
| **tldraw (make real)**             | "Make real": draw a wireframe, get a working UI; the whiteboard-as-prototype idea went viral; docs for its AI SDK                                         | App mode with hotspots and standalone interactive HTML export                     | Dream's differentiator: the same make-real idea aimed at kids and non-developers, offline and free                    | https://simonwillison.net/2023/Nov/16/tldrawdraw-a-ui/ · https://makereal.tldraw.com · https://tldraw.dev/docs/ai                                                      |
| **Kid Pix**                        | The beloved kids' drawing program: stamps, wacky brushes, sound effects, joyful chaos; defined the genre                                                  | Kid mode, spoken names, playful tools, free                                       | Stamps/stickers and more sensory delight are proven hooks Dream should lean into                                      | https://wepresent.wetransfer.com/stories/kid-pix-anniversary · https://pketh.org/kid-pix.html                                                                          |
| **Tux Paint**                      | Open-source kids' drawing app: big simple UI, stamps, sound, parental controls; the free-software standard                                                | Kid mode, free, offline, no ads                                                   | Coloring starters, stamp sets, and localized audio are table stakes in this niche                                     | https://linuxlinks.com/ (Tux Paint article) · https://mankier.com/1/tuxpaint                                                                                           |
| **Drawing-for-kids apps (mobile)** | Guided step-by-step drawing, coloring books, tracing; huge app-store category with ads/subscriptions                                                      | Free, no ads, offline PWA, privacy by default                                     | A starter content pack (stamps, stickers, coloring outlines) competes directly without the monetization dark patterns | https://theartinvestor.co.uk/ (kids' drawing apps)                                                                                                                     |
| **Procreate (+ Dreams)**           | Procreate Dreams: performative animation, flipbook, keyframes on iPad; the pro illustration benchmark                                                     | Frame-based animation, onion skin, sprite-sheet export, playback                  | Dream can't match brush depth; it wins on approachability and "drawing becomes a game/app"                            | https://procreate.com/insight/2023/procreate-dreams-reveal · https://help.procreate.com/ (animation interface)                                                         |
| **Excalidraw(+)**                  | Hand-drawn style diagrams, AI diagram generation, Excalidraw+ collaboration/cloud                                                                         | Simple shapes, app-mode links                                                     | AI-assisted diagram/sketch polish is a possible future tool; collaboration deliberately out of scope                  | https://nimbalyst.com/blog/best-ai-diagram-tools-2026/ · https://plus.excalidraw.com/plus                                                                              |
| **Recraft**                        | AI image/vector generation with style control, brand-consistent sets, vector output                                                                       | AI raster generation plus truthful SVG delivery for native scalable marks         | AI-generated and editable vector paths remain a different medium; keep that separate from simple native-mark export   | https://eesel.ai/blog/recraft-ai                                                                                                                                       |
| **Krita + AI Diffusion**           | Open-source paint app + the Acly/krita-ai-diffusion plugin: local SD, inpainting, live painting                                                           | Open-source ethos, BYOK AI                                                        | Proves local/BYOK diffusion is viable; Dream's MockAIProvider + BYOK is the web-native equivalent                     | https://github.com/Acly/krita-ai-diffusion · https://makeuseof.com/ (Krita generative fill article)                                                                    |
| **Leonardo AI**                    | High-quality generative image suite (now under Canva for business); fine-tuned models, canvas editing                                                     | BYOK provider architecture                                                        | A Leonardo-class model behind BYOK raises Dream's ceiling without new infrastructure                                  | https://www.canva.com/business/features/leonardo-ai/                                                                                                                   |
| **Visual Electric / Rabbitholes**  | Infinite-canvas generative ideation: images branch and remix spatially                                                                                    | Infinite-ish creative canvas, layer compositor                                    | Spatial generative workflows are an emerging pattern to watch, not to copy yet                                        | https://ltdplace.com/rabbitholes-ai/                                                                                                                                   |

Cross-cutting takeaways:

1. **AI is now table stakes in every tier** — from MS Paint to Firefly. Dream's
   edge is not having AI but how it's delivered: free out of the box
   (MockAIProvider), unlimited with BYOK, and never a subscription.
2. **The "drawing becomes something real" meme is validated** — tldraw's
   make-real, Figma's First Draft, Procreate Dreams all bet on creation
   flowing into another medium. Dream is the only one doing it for kids and
   non-developers, offline, in the browser.
3. **Nobody owns "simple AND grows with you."** Paint is simple but shallow;
   Canva/Figma are deep but template/enterprise-first; kids' apps are ad-riddled
   dead ends. The gap between first scribble and shipped prototype is open.

## 2. UX research digest

### Children (ages 4–8)

1. **Kids navigate by recognition, not recall** — they click pictures, not
   words; iconography and spatial memory dominate. (https://www.nngroup.com/articles/childrens-websites-usability-issues/)
   _Dream:_ Big pictorial toolbar, tooltips spoken aloud in kid mode, minimal
   text anywhere a child might touch.
2. **Children's interfaces differ fundamentally from adults'** — adults scan
   and skim; children explore and click everything. (https://fruto.design/ — child-vs-adult blog)
   _Dream:_ Every accidental click is recoverable (full undo history); nothing
   destructive is reachable from the canvas.
3. **Speech interfaces fit pre-literate children** — young kids can talk long
   before they can type or read fluently. (https://cise.ufl.edu/ — speech paper)
   _Dream:_ Voice commands and dictation are first-class in kid mode, behind
   feature detection, never required.
4. **Immediate sensory feedback sustains engagement** — sounds and instant
   visual response matter more than correctness. (https://www.frontiersin.org/ — fcomp.2022.791704)
   _Dream:_ Tool sounds, spoken names, and instant canvas response on every
   stroke.
5. **Avoid text-heavy instruction and error states** — reading level gates
   everything. (https://www.nngroup.com/articles/childrens-websites-usability-issues/)
   _Dream:_ No dialogs a child must read to continue; spoken names replace
   tooltips in kid mode.

### Older adults (65+)

6. **Larger targets, higher contrast, fewer modes** — motor precision and
   vision decline; generous hit areas and clear states are essential.
   (https://www.nngroup.com/articles/usability-for-senior-citizens/)
   _Dream:_ Design tokens control sizing/contrast; a senior comfort toggle is
   a small, high-value addition (backlog #7).
7. **WCAG 2.5.5 Target Size (AAA): 44×44px minimum** — pointer targets must be
   big enough for shaky or imprecise pointing. (https://accessibility.build/wcag/2-5-5)
   _Dream:_ Toolbar buttons already meet or exceed this; keep it a hard rule
   for every new control.
8. **Reduce memory load: one thing at a time, visible state** — avoid hidden
   gestures and mode ambiguity. (https://boia.org/ — older-adults blog)
   _Dream:_ The active tool is always visually indicated; modes (Design /
   Animate / Play / Present) are explicit tabs, not gestures.

### Low-literacy users

9. **Plain language, short sentences, front-loaded meaning** — write for a
   lower reading level; put the point first. (https://www.nngroup.com/articles/writing-for-lower-literacy-users/)
   _Dream:_ All UI strings live in i18n tables written in plain words; keep
   them short.
10. **Icons must be concrete and familiar** — abstract icons fail; literal,
    recognizable pictograms work. (https://x-mol.com/ — icon study)
    _Dream:_ Tool icons are literal (a pencil, an eraser, a bucket), and kid
    mode speaks their names aloud.
11. **Pair text with audio and imagery** — multimodal redundancy compensates
    for reading difficulty. (https://fupubco.com/futech/article/download/74/59)
    _Dream:_ Speech synthesis (`say.ts`) can voice any label; locale-aware
    strings keep wording natural.

### 10/10 persona and interaction benchmark (2026)

The product-idea personas are examples of deeper jobs, not feature requests.
Current authoritative guidance and professional workflows raise these bars:

1. **Older creators need more than larger controls.** Age-related vision,
   dexterity, hearing and short-term-memory changes require strong contrast,
   low precision demand, persistent orientation, restrained distraction and
   multiple input paths. Dream's comfort mode is a foundation, not the finish.
   (https://www.w3.org/WAI/older-users/)
2. **Child-centric AI explains itself at the moment of action and is tested
   with diverse children.** A kid-facing prompt box is not enough; safety,
   culturally appropriate language, visible confirmation and representative
   child research belong to the experience.
   (https://www.unicef.org/digitalimpact/stories/child-centric-ai)
3. **Professional image work is non-destructive.** Current Photoshop guidance
   treats adjustment layers and editable masks as the flexible default for
   color/tonal changes and local refinements. Dream's baked filters and box-only
   edits are useful but do not yet meet Ali's expected substrate.
   (https://helpx.adobe.com/photoshop/desktop/create-manage-layers/color-adjustment-fill-layers/create-adjustment-layers.html ·
   https://helpx.adobe.com/ca/photoshop/desktop/create-manage-layers/color-adjustment-fill-layers/use-layer-masks-to-target-adjustment-or-fill-layers.html)
4. **Professional product design is system design.** Responsive auto layout,
   variables/tokens, component properties/variants and high-fidelity prototype
   state are baseline productivity concepts. Dream's copied components and
   manual alignment cover composition, not Aleksandr's full job.
   (https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties ·
   https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma ·
   https://help.figma.com/hc/en-us/articles/5579474826519-Explore-component-properties)
5. **Scientific figures are integrity-bearing deliverables.** Journal guidance
   expects labelled units, accessible color, legible/editable text, scale bars,
   high-resolution images, editable vector output and transparent manipulation
   practices. A pleasant chart alone is not publication readiness.
   (https://research-figure-guide.nature.com/figures/preparing-figures-our-specifications/ ·
   https://www.nature.com/ncomms/editorial-policies/image-integrity)
6. **Agent-native means discoverable typed workflows, not only callable
   functions.** MCP's current model includes tools, resources and prompts;
   tools can declare output schemas and side-effect annotations so clients and
   humans can reason about actions. Dream's local tool set is a starting point.
   (https://modelcontextprotocol.io/docs/learn/server-concepts ·
   https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
7. **Short-video delivery is mobile and format-aware.** Current YouTube guidance
   treats square or vertical videos up to three minutes as Shorts; the creator's
   real job also includes readable safe areas, audio/caption control, size and a
   low-friction upload/share handoff.
   (https://support.google.com/youtube/answer/15424877)

Modern interaction craft should make state legible rather than add spectacle:

- **On a phone, prioritize the primary task and move lower-frequency commands
  into an explicit More menu—not a sideways-scrolling desktop toolbar.** Keep
  navigation/workspace choices visible for orientation, label disclosed menu
  actions clearly, and order frequent actions first. Dream therefore keeps its
  four workspaces plus Story/AI/voice/recovery visible and discloses file and
  setup actions in one labelled tray.
  (https://developer.apple.com/design/human-interface-guidelines/designing-for-ios ·
  https://developer.apple.com/design/human-interface-guidelines/toolbars ·
  https://developer.apple.com/design/human-interface-guidelines/menus)
- **Drag in one motion, show a translucent preview, highlight only valid drop
  targets, keep the result selected and provide an alternative to every drag.**
  Failed drops need visible recovery, and known transfer work needs progress.
  A compact custom pointer image can stay legible while the destination shows
  the accurate spatial preview.
  (https://developer.apple.com/design/human-interface-guidelines/drag-and-drop ·
  https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/setDragImage)
- **Pointers communicate outcome.** Select, crosshair, text, open/closed-hand
  pan, resize/rotate, copy/link and not-allowed states should follow the active
  interaction rather than remain a static cursor per tool.
  (https://developer.apple.com/design/human-interface-guidelines/pointing-devices)
- **Motion is brief, causal and cancellable.** It follows the gesture, explains
  state, never delays frequent work and collapses under reduced motion. Current
  professional systems cluster frequent hover/press feedback around 50–220 ms
  and reserve longer motion for larger spatial transitions.
  (https://developer.apple.com/design/human-interface-guidelines/motion ·
  https://spectrum.adobe.com/page/motion/ ·
  https://atlassian.design/foundations/motion)
- **Loading shows something immediately.** Use determinate progress when the
  work is countable, indeterminate activity when it is not, allow unrelated
  work where safe, and never leave a blank or apparently frozen surface. For
  multi-item content, reveal finished items and leave item-level placeholders
  or progress only where work remains instead of holding the complete result.
  (https://developer.apple.com/design/human-interface-guidelines/progress-indicators ·
  https://spectrum.adobe.com/page/progress-bar/ ·
  https://spectrum.adobe.com/page/cards/)
- **Haptics are sparse, optional and redundant.** A short pulse may reinforce a
  snap, successful drop or game collision on supported hardware, but must match
  visible/audio feedback and must never buzz continuously while drawing. Shape
  alignment is specifically suited to a discrete detent; repeated motion along
  the same guide is not a new event.
  (https://developer.apple.com/design/human-interface-guidelines/playing-haptics)

## 3. Trend watch

1. **MCP ecosystem goes mainstream** — the Model Context Protocol hit its
   first anniversary with broad client adoption and an official registry;
   GitHub shipped its own MCP registry in September 2025. Publishing
   `dream-mcp` to registries is timely and cheap.
   (https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/ ·
   https://github.blog/ — MCP registry changelog 2025-09-16)
2. **Local-first software keeps gaining mindshare** — Ink & Switch's
   local-first essay and the broader anti-SaaS sentiment favor apps that own
   no user data and work offline. Dream's IndexedDB-only, no-backend
   architecture is exactly on trend.
   (https://inkandswitch.com/essay/local-first/ · https://barestack.org/ — anti-SaaS manifesto)
3. **BYOK economics win for AI features** — users increasingly bring their own
   API keys rather than pay per-seat AI markups; BYOK is now a recognized
   pricing pattern for 2026. Dream's provider registry + key-handling rules
   already implement it.
   (https://buildmvpfast.com/ — BYOK 2026 · https://heyhelp.ai/byok/)
4. **Voice-native interfaces for children** — NSF-funded and academic work
   shows voice is the natural modality for pre-literate users; voice-first
   kids' software is an emerging category with few privacy-respecting players.
   (https://par.nsf.gov/ — purl 10276955)
5. **WebGPU brings on-device AI inference to the browser** — WebGPU is
   reaching critical mass across browsers, making client-side model inference
   practical; a future Dream could run generative models fully offline.
   (https://webgpu.com/ — critical-mass news · https://aicompetence.org/ — WebGPU inference)
6. **Native compression is ready; native sharing is not universal yet** — gzip
   Compression Streams have broad cross-browser availability, while the Web
   Share API still has material browser gaps and secure-context requirements.
   _Dream:_ compress viewer-only app data into the URL fragment, make Copy link
   the universal action, and keep native sharing optional rather than required.
   (https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream/CompressionStream ·
   https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)

## 4. Prioritized backlog

Ranked by impact across personas (Zainab the child, George her grandfather,
Victor the senior user, Maria the teacher, Ahmed the developer, Sara the
presenter, Zǐxuān the student, Ali/Fatima the hobbyists). Score: impact
1–5; Effort: S/M/L.

| #   | Feature                                                                                                                                                               | Personas              | Impact | Effort |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------ | ------ |
| 1   | ~~AI "make real" code export — turn an app-mode drawing into runnable code~~ ✅ shipped (slice 18)                                                                    | Maria, Ahmed, Sara    | 5      | M      |
| 2   | ~~More game templates + conversational game generation~~ ✅ shipped (slices 22–23)                                                                                    | Zainab, George        | 5      | M      |
| 3   | ~~Stamps, stickers, and coloring-page starters~~ ✅ shipped (slice 16)                                                                                                | Zainab, George        | 4      | S      |
| 4   | ~~Voice narration recording for animations and Present mode~~ ✅ shipped (slice 19)                                                                                   | Zainab, Ahmed, Victor | 4      | M      |
| 5   | ~~Generative fill / inpainting via BYOK providers~~ ✅ shipped (slice 20)                                                                                             | Ali, Fatima, Sara     | 4      | M      |
| 6   | ~~Localized voice-command vocabularies, Arabic-first~~ ✅ shipped (slice 16)                                                                                          | Zainab, George, Ahmed | 4      | S      |
| 7   | ~~Senior comfort toggle (larger UI, higher contrast, slower animations)~~ ✅ shipped (slice 16)                                                                       | Victor                | 4      | S      |
| 8   | Publish dream-mcp to MCP registries + add more tools — authoring/layer/stroke tools and registry package ready (slices 21 + 41 + 43); public publish pending approval | Maria                 | 4      | S      |
| 9   | ~~Slide transitions, timing, notes and a private Presenter window~~ ✅ shipped (slices 24 + 29)                                                                       | Sara, Zǐxuān, Victor  | 3      | M      |
| 10  | ~~Social video shapes and frame captions~~ ✅ shipped (slice 27)                                                                                                      | Ahmed                 | 4      | M      |
| 11  | ~~Shareable prototype via URL (compressed viewer state, no backend)~~ ✅ shipped (slice 31)                                                                           | Ahmed, Sara, Zǐxuān   | 3      | L      |
| 12  | ~~Voice-to-storyboard animation with visible bilingual confirmation~~ ✅ shipped (slice 28)                                                                           | Zainab, George        | 5      | M      |
| 13  | ~~Phone timeline task focus for animation, slides and apps~~ ✅ shipped (slice 30)                                                                                    | George, Ahmed, Sara   | 4      | S      |
| 14  | ~~Non-destructive frame-range trimming with synchronized narration~~ ✅ shipped (slice 32)                                                                            | Ahmed                 | 4      | S      |
| 15  | ~~Persian-first RTL, voice, calligraphy nib and script typography~~ ✅ shipped (slice 33)                                                                             | Fatima                | 5      | M      |
| 16  | ~~Scientific connectors, notation and truthful scalable SVG delivery~~ ✅ shipped (slice 34)                                                                          | Zǐxuān, Sara          | 5      | M      |
| 17  | ~~Paste CSV/TSV into grouped native line, scatter or bar plots~~ ✅ shipped (slice 35)                                                                                | Zǐxuān                | 5      | M      |
| 18  | ~~Complete Simplified Chinese UI, unspaced voice commands, story planning and offline game language~~ ✅ shipped (slice 36)                                           | Zǐxuān                | 5      | M      |
| 19  | ~~Complete Brazilian Portuguese UI, voice commands, story planning and offline game language~~ ✅ shipped (slice 37)                                                  | Maria                 | 4      | M      |
| 20  | ~~Complete Russian UI, voice commands, story planning and offline game language~~ ✅ shipped (slice 38)                                                               | Aleksandr             | 4      | M      |
| 21  | ~~Compact brush presets that expose rather than hide their size, opacity and tip~~ ✅ shipped (slice 39)                                                              | Ali, Aleksandr        | 4      | S      |
| 22  | ~~One-click brand pack with exact multi-size PNGs and truthful optional SVG~~ ✅ shipped (slice 40)                                                                   | Sara, Aleksandr       | 4      | S      |
| 23  | ~~Agent-safe layer rename/configure/reorder/removal through dream-mcp~~ ✅ shipped (slice 41)                                                                         | Maria                 | 4      | S      |
| 24  | ~~Pressure-aware brush/pencil/eraser authoring through dream-mcp~~ ✅ shipped (slice 43)                                                                              | Maria                 | 4      | S      |

Deliberately deferred: **general vector-path editing** (slice 34 exports
genuinely scalable native marks without introducing a second editing medium), **real-time
collaboration** (conflicts with local-first/no-backend; revisit only with a
CRDT story), **large template galleries** (needs content operations, not
code — start with the starter pack in #3), and **pro-level brush depth**
(Procreate's home turf; Dream wins on approachability, not fidelity).

## 5. Positioning

> Dream is the creative canvas where a drawing is never the end — it becomes
> an animation, a game, a presentation, or a real app you can send to anyone.
> It is as simple as MS Paint on first touch, as deep as a design tool when
> you grow into it, and free, offline, and private by default — with AI that
> works out of the box and gets unlimited when you bring your own key. Built
> for a 5-year-old's first scribble and a professional's shipped prototype
> alike, Dream is the only creative tool designed for literally everyone.

Taglines:

1. Dream — where drawings come alive.
2. Dream — draw it, play it, ship it.
3. Dream — the canvas that grows up with you.
4. Dream — from first scribble to finished app.
5. Dream — everyone's canvas. No tutorial required.
