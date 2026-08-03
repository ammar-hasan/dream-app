# The AI panel (Dream AI + BYOK)

**Purpose.** A friendly assistant you talk to, opened with the sparkle
button or the **A** key. Three actions — **Create, Edit, Feedback** — and
everything it does lands on the document through the same undoable history
as your own strokes.

## The three actions

### Create

Describe what you want ("a sleepy fox under a starry sky") → the picture
appears as a **new layer**, centered, scaled to fit, named from your words
(first 40 characters). One undoable change. A mic button fills the prompt
by voice where speech recognition exists (hidden where it doesn't).
Confirmation: "Ta-da! Your picture is on a brand-new layer."

### Edit

Describe a change ("warmer", "dreamy", "more pop") → applied to the active
layer. With **"Selected part only"** ticked (default on when a Design-mode
selection exists), only the selection's bounding box is edited; the rest of
the layer is untouched. One undoable change ("Done! Undo is there if you
liked it better before."). Needs a non-empty layer.

### Feedback

"Look at my design" returns kind, concrete observations plus suggestions —
each with an **Apply** button where Dream can do it for you (one click,
undoable): filter fixes bake into the active layer; a centering suggestion
moves the Design-mode selection to the canvas center.

## Dream AI (the built-in provider)

Free, works **fully offline**, deterministic: the same prompt at the same
size paints the same picture, always (the prompt is the seed).

### Create — the scene vocabulary

The first matching theme below paints the scene (prompt matched
case-insensitively); anything else paints a cheerful day scene. Scenes are
procedural landscapes: a sky gradient, a celestial body with a soft glow,
layered hills, and theme extras (stars, trees, sea bands).

| Theme | Trigger words (any) | Character |
|---|---|---|
| Night | night, star, moon, space, galaxy, midnight | deep indigo sky, crescent moon, ~140 stars |
| Sunset | sunset, sunrise, dusk, dawn, evening | violet-to-peach sky, low glowing sun |
| Forest | forest, tree, woods, jungle, pine | soft green sky, tree line (count scales with width) |
| Ocean | ocean, sea, beach, water, wave, island | sky, sand band, two-tone sea |
| Mountain | mountain, snow, winter, alps, peak | pale wintry sky, snow-capped ranges |
| Desert | desert, cactus, dune, sand | warm cream sky, dune layers |
| Day (fallback) | — | blue sky, sun, green hills |

### Edit — the keyword recipes

The first matching rule wins; its values override a gentle default warm-up
(saturation +15, brightness +5, sepia +10) — unmentioned sliders keep the
default.

| Words | Recipe |
|---|---|
| black and white, grey/gray, mono | grayscale 100 |
| vintage, old, retro, sepia | sepia 70, contrast 15, brightness −5 |
| warm, sunset, cosy/cozy, golden | sepia 25, saturation 10, brightness 5 |
| cool, cold, blue, winter, icy | hue −15, saturation 10, brightness 5 |
| bright, lighten, sunnier | brightness 25 |
| dark, night, moody, dim | brightness −25 |
| contrast, pop, punch | contrast 30 |
| blur, soft, dreamy, fog | blur 3 |
| sharp, crisp, clear | sharpen 60 |
| invert, negative | invert 100 |
| colorful, vivid, saturate | saturation 40 |
| hue, psychedelic, rainbow | hue 120, saturation 20 |
| (no keyword) | the default warm-up only |

### Feedback — the rule list

Rules evaluate the actual document (palette, coverage, contrast, warmth,
darkness). The first matching suggestions are returned with kind wording;
when nothing applies: "Honestly? This is looking lovely. Keep going!"

| Condition | Observation gist | Apply action |
|---|---|---|
| canvas blank | "the best place to start" | — |
| coverage < 12% | lots of empty space | — |
| contrast very low | looks a little flat | contrast +30 |
| palette chilly (warmth < −0.08) | a little chilly | sepia 25, saturation 10, brightness 5 |
| palette very warm (warmth > 0.3) | suggest a cool accent | hue −15, saturation 10, brightness 5 |
| very dark overall | brighten it | brightness +20 |
| selection sits >10% off-center | center it | center selection |
| everything on one layer (≥5 marks) | suggest layers | — |
| canvas > 85% full | suggest breathing room | — |

The summary always says what it sees: "I see N marks on L layers, covering
about X% of the canvas. The colors feel warm and cosy / cool and calm /
nicely balanced."

### The free tier

**20 free Dream AI tries per day** (local calendar day, rolls over at
midnight), counted across Create/Edit/Feedback and shown subtly in the
panel ("N free tries left today"). At zero: "That is all the free dreams
for today! Add your own AI in Settings below for unlimited magic."
Connecting your own provider makes the counter disappear — unlimited.

## BYOK — bring your own key

In the panel's Settings, point Dream at any **OpenAI-compatible endpoint**:
base URL, model, API key, plus "This AI can also paint images" for
endpoints with image generation.

- **Chat** (feedback) goes to `/chat/completions`; **image creation** to
  `/images/generations` (requested as base64, size matching the document).
- **Editing is not offered on BYOK** (no shared image-edit API across
  providers) — the Edit tab says so kindly and offers to switch back to
  Dream AI. Image-less endpoints disable the Create tab the same way.
- **Test connection** validates URL/key/model with one cheap round-trip
  and reports success ("It works! Your AI said hello back.") or a friendly,
  jargon-free error ("Could not reach … — is the URL right and the app
  running?", "the API key was rejected — check it and try again", "that
  endpoint was not found — check the base URL and model name").
- **Key handling (rules):** keys live in **session-only storage by
  default** (gone when the app closes); "Remember key on this device" opts
  into device storage; keys are sent only as the authorization header to
  the configured endpoint, are **never logged**, never appear in error
  messages, and never land in the settings blob. Settings (URL, model,
  toggles, active provider) persist on-device.
- Known-good starting points: OpenRouter
  (`https://openrouter.ai/api/v1`, e.g. `openai/gpt-4o-mini`), Ollama
  (`http://localhost:11434/v1`, e.g. `llama3.1`, no key needed), LM Studio
  (`http://localhost:1234/v1`, the loaded model).

## Kid mode

The AI panel simplifies to a single Create box with a giant mic and a big
"Make it!" button — no tabs, no settings.

## Edge cases

- A busy assistant ignores further requests until the current one
  finishes.
- Provider errors surface verbatim when friendly, else "Hmm, that did not
  work. Try again?"
- An empty AI answer → "The AI answered, but said nothing. Try again?"
- Free-tier bookkeeping failure never blocks creation (fail-open).
- Feedback Apply on an empty layer explains itself instead of failing.
