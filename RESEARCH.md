# Dream — Research (v0.1.0 release-day edition)

Prepared: 2026-08-02

This document collects the competitive landscape, UX research digest, trend
watch, prioritized backlog, and positioning that informed the v0.1.0 release
of Dream.

## 1. Competitive landscape

| Product                            | Standout features                                                                                                                                        | What Dream has                                                                    | Gap / opportunity                                                                                                     | Source                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **MS Paint (Copilot)**             | Generative fill/erase, image creator, background removal built into the default Windows paint app; the "everyone's first editor" now ships AI by default | Simple immediate canvas, kid-first UX, AI built in                                | Dream must beat Paint's new AI baseline while staying simpler than Paint's growing ribbon                             | https://windowslatest.com/ (Paint Copilot hub)                                                                    |
| **Canva (Magic Studio)**           | Magic Design/Write/Media, brand kits, one-click resize, massive template library; the template-first workflow for non-designers                          | Free, offline, no account; drawing-first rather than template-first               | Template/starter galleries and coloring pages are Dream's entry point to the Canva audience                           | https://www.shopify.com/blog/how-to-use-canva-ai                                                                  |
| **Figma (AI / FigJam)**            | First Draft generates editable UI from a prompt; multiplayer canvas; the professional design default                                                     | App mode (hotspots, links), HTML prototype export, Play mode                      | "Make real" code export and conversational generation close the prompt-to-app gap for non-designers                   | https://help.figma.com/ (First Draft article)                                                                     |
| **Adobe Express / Firefly**        | Firefly generative models across Express/Photoshop; Firefly Max 2025 bundles; commercially-safe generative fill                                          | BYOK AI providers, MockAIProvider free tier, generative features feature-detected | Generative fill/inpainting via BYOK is Dream's answer without subscription lock-in                                    | https://economictimes.indiatimes.com/ (Adobe Firefly Max 2025)                                                    |
| **tldraw (make real)**             | "Make real": draw a wireframe, get a working UI; the whiteboard-as-prototype idea went viral; docs for its AI SDK                                        | App mode with hotspots and standalone interactive HTML export                     | Dream's differentiator: the same make-real idea aimed at kids and non-developers, offline and free                    | https://simonwillison.net/2023/Nov/16/tldrawdraw-a-ui/ · https://makereal.tldraw.com · https://tldraw.dev/docs/ai |
| **Kid Pix**                        | The beloved kids' drawing program: stamps, wacky brushes, sound effects, joyful chaos; defined the genre                                                 | Kid mode, spoken names, playful tools, free                                       | Stamps/stickers and more sensory delight are proven hooks Dream should lean into                                      | https://wepresent.wetransfer.com/stories/kid-pix-anniversary · https://pketh.org/kid-pix.html                     |
| **Tux Paint**                      | Open-source kids' drawing app: big simple UI, stamps, sound, parental controls; the free-software standard                                               | Kid mode, free, offline, no ads                                                   | Coloring starters, stamp sets, and localized audio are table stakes in this niche                                     | https://linuxlinks.com/ (Tux Paint article) · https://mankier.com/1/tuxpaint                                      |
| **Drawing-for-kids apps (mobile)** | Guided step-by-step drawing, coloring books, tracing; huge app-store category with ads/subscriptions                                                     | Free, no ads, offline PWA, privacy by default                                     | A starter content pack (stamps, stickers, coloring outlines) competes directly without the monetization dark patterns | https://theartinvestor.co.uk/ (kids' drawing apps)                                                                |
| **Procreate (+ Dreams)**           | Procreate Dreams: performative animation, flipbook, keyframes on iPad; the pro illustration benchmark                                                    | Frame-based animation, onion skin, sprite-sheet export, playback                  | Dream can't match brush depth; it wins on approachability and "drawing becomes a game/app"                            | https://procreate.com/insight/2023/procreate-dreams-reveal · https://help.procreate.com/ (animation interface)    |
| **Excalidraw(+)**                  | Hand-drawn style diagrams, AI diagram generation, Excalidraw+ collaboration/cloud                                                                        | Simple shapes, app-mode links                                                     | AI-assisted diagram/sketch polish is a possible future tool; collaboration deliberately out of scope                  | https://nimbalyst.com/blog/best-ai-diagram-tools-2026/ · https://plus.excalidraw.com/plus                         |
| **Recraft**                        | AI image/vector generation with style control, brand-consistent sets, vector output                                                                      | AI raster generation via providers                                                | Vector/SVG generation is a different medium — deferred; raster-first keeps Dream simple                               | https://eesel.ai/blog/recraft-ai                                                                                  |
| **Krita + AI Diffusion**           | Open-source paint app + the Acly/krita-ai-diffusion plugin: local SD, inpainting, live painting                                                          | Open-source ethos, BYOK AI                                                        | Proves local/BYOK diffusion is viable; Dream's MockAIProvider + BYOK is the web-native equivalent                     | https://github.com/Acly/krita-ai-diffusion · https://makeuseof.com/ (Krita generative fill article)               |
| **Leonardo AI**                    | High-quality generative image suite (now under Canva for business); fine-tuned models, canvas editing                                                    | BYOK provider architecture                                                        | A Leonardo-class model behind BYOK raises Dream's ceiling without new infrastructure                                  | https://www.canva.com/business/features/leonardo-ai/                                                              |
| **Visual Electric / Rabbitholes**  | Infinite-canvas generative ideation: images branch and remix spatially                                                                                   | Infinite-ish creative canvas, layer compositor                                    | Spatial generative workflows are an emerging pattern to watch, not to copy yet                                        | https://ltdplace.com/rabbitholes-ai/                                                                              |

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

## 4. Prioritized backlog

Ranked by impact across personas (Zainab the child, George her grandfather,
Victor the senior user, Maria the teacher, Ahmed the developer, Sara the
presenter, Zǐxuān the student, Ali/Fatima the hobbyists). Score: impact
1–5; Effort: S/M/L.

| #   | Feature                                                                                            | Personas              | Impact | Effort |
| --- | -------------------------------------------------------------------------------------------------- | --------------------- | ------ | ------ |
| 1   | ~~AI "make real" code export — turn an app-mode drawing into runnable code~~ ✅ shipped (slice 18) | Maria, Ahmed, Sara    | 5      | M      |
| 2   | More game templates + conversational game generation ("make a game where…")                        | Zainab, George        | 5      | M      |
| 3   | ~~Stamps, stickers, and coloring-page starters~~ ✅ shipped (slice 16)                             | Zainab, George        | 4      | S      |
| 4   | ~~Voice narration recording for animations and Present mode~~ ✅ shipped (slice 19)                | Zainab, Ahmed, Victor | 4      | M      |
| 5   | Generative fill / inpainting via BYOK providers                                                    | Ali, Fatima, Sara     | 4      | M      |
| 6   | ~~Localized voice-command vocabularies, Arabic-first~~ ✅ shipped (slice 16)                       | Zainab, George, Ahmed | 4      | S      |
| 7   | ~~Senior comfort toggle (larger UI, higher contrast, slower animations)~~ ✅ shipped (slice 16)    | Victor                | 4      | S      |
| 8   | Publish dream-mcp to MCP registries + add more tools                                               | Maria                 | 4      | S      |
| 9   | Slide transitions, speaker notes, per-slide duration                                               | Sara, Zǐxuān, Victor  | 3      | M      |
| 10  | Shareable prototype via URL (hash-compressed state, no backend)                                    | Ahmed, Sara, Zǐxuān   | 3      | L      |

Deliberately deferred: **vector/SVG editing** (different medium — Recraft and
Excalidraw own it; raster-first keeps Dream simple), **real-time
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
