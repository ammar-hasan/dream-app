# The AI panel (Dream AI + BYOK)

**Purpose.** A friendly assistant you talk to, opened with the sparkle
button or the **A** key. Three panel actions — **Create, Edit, Feedback** — and
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

When a connected provider declares generative editing, the same box accepts
open-ended changes such as "put a little boat here." The provider sees the
whole active-layer image for visual context plus a mask for the selected
bounding box; Dream accepts only the returned pixels inside that box, so the
rest of the layer remains exact even if the provider strays. With no selection
(or "Selected part only" off), the whole layer is the edit area.

When no part is selected, the panel states plainly that Edit will change the
whole active layer and offers **Select a part**. That action switches directly
to Design with Select active; the user can click an object or drag a marquee
without first discovering the mode/tool relationship elsewhere.

Generative editing also reveals **Erase this**. One tap asks the provider to
remove the object in the masked area and fill the space naturally with the
surrounding background. It uses the selection when present and otherwise the
whole layer. Success says "Gone! Undo brings it back." Both fill and erase are
one undoable bake.

### Feedback

"Look at my design" returns kind, concrete observations plus suggestions —
each with an **Apply** button where Dream can do it for you (one click,
undoable): filter fixes bake into the active layer; a centering suggestion
moves the Design-mode selection to the canvas center.

### Progress and stopping

Create, Edit and Feedback show an indeterminate activity track while the result
cannot be measured honestly. The accompanying message begins with the action
Dream is taking, becomes more specific after a short wait, and acknowledges
that a detailed request can take a minute rather than inventing a percentage.
The message is announced without repeatedly interrupting assistive technology.

**Cancel** is always available beside that progress. It stops a connected
network request when the service supports stopping, returns the panel to a
ready state immediately either way, and confirms that nothing changed. A result
that arrives after cancellation is discarded and can never add or alter a
layer. Existing artwork, prompt text and undo history remain exact.

## Dream AI (the built-in provider)

Free, works **fully offline**, deterministic: the same prompt at the same
size paints the same picture, always (the prompt is the seed).
The provider name and Create guidance identify it as an offline scene maker
and name its supported themes; they never imply open-ended image generation.

### Create — the scene vocabulary

The first matching theme below paints the scene (prompt matched
case-insensitively); anything else paints a cheerful day scene. Scenes are
procedural landscapes: a sky gradient, a celestial body with a soft glow,
layered hills, and theme extras (stars, trees, sea bands).

| Theme          | Trigger words (any)                        | Character                                           |
| -------------- | ------------------------------------------ | --------------------------------------------------- |
| Night          | night, star, moon, space, galaxy, midnight | deep indigo sky, crescent moon, ~140 stars          |
| Sunset         | sunset, sunrise, dusk, dawn, evening       | violet-to-peach sky, low glowing sun                |
| Forest         | forest, tree, woods, jungle, pine          | soft green sky, tree line (count scales with width) |
| Ocean          | ocean, sea, beach, water, wave, island     | sky, sand band, two-tone sea                        |
| Mountain       | mountain, snow, winter, alps, peak         | pale wintry sky, snow-capped ranges                 |
| Desert         | desert, cactus, dune, sand                 | warm cream sky, dune layers                         |
| Day (fallback) | —                                          | blue sky, sun, green hills                          |

### Edit — the keyword recipes

Dream AI editing is deliberately filter-based, not generative. It never shows
**Erase this** and never claims to invent or remove image content.

The first matching rule wins; its values override a gentle default warm-up
(saturation +15, brightness +5, sepia +10) — unmentioned sliders keep the
default.

| Words                            | Recipe                                |
| -------------------------------- | ------------------------------------- |
| black and white, grey/gray, mono | grayscale 100                         |
| vintage, old, retro, sepia       | sepia 70, contrast 15, brightness −5  |
| warm, sunset, cosy/cozy, golden  | sepia 25, saturation 10, brightness 5 |
| cool, cold, blue, winter, icy    | hue −15, saturation 10, brightness 5  |
| bright, lighten, sunnier         | brightness 25                         |
| dark, night, moody, dim          | brightness −25                        |
| contrast, pop, punch             | contrast 30                           |
| blur, soft, dreamy, fog          | blur 3                                |
| sharp, crisp, clear              | sharpen 60                            |
| invert, negative                 | invert 100                            |
| colorful, vivid, saturate        | saturation 40                         |
| hue, psychedelic, rainbow        | hue 120, saturation 20                |
| (no keyword)                     | the default warm-up only              |

### Feedback — the rule list

Rules evaluate the actual document (palette, coverage, contrast, warmth,
darkness). The first matching suggestions are returned with kind wording;
when nothing applies: "Honestly? This is looking lovely. Keep going!"

| Condition                          | Observation gist          | Apply action                          |
| ---------------------------------- | ------------------------- | ------------------------------------- |
| canvas blank                       | "the best place to start" | —                                     |
| coverage < 12%                     | lots of empty space       | —                                     |
| contrast very low                  | looks a little flat       | contrast +30                          |
| palette chilly (warmth < −0.08)    | a little chilly           | sepia 25, saturation 10, brightness 5 |
| palette very warm (warmth > 0.3)   | suggest a cool accent     | hue −15, saturation 10, brightness 5  |
| very dark overall                  | brighten it               | brightness +20                        |
| selection sits >10% off-center     | center it                 | center selection                      |
| everything on one layer (≥5 marks) | suggest layers            | —                                     |
| canvas > 85% full                  | suggest breathing room    | —                                     |

The summary always says what it sees: "I see N marks on L layers, covering
about X% of the canvas. The colors feel warm and cosy / cool and calm /
nicely balanced."

### Story to animation

**Story** is the assistant's fifth capability and lives beside Animate rather
than inside the panel. One English, Arabic, Persian, Simplified Chinese,
Brazilian Portuguese or Russian story is planned locally into two to six
editable moments before any provider call or document change. Each
reviewed moment can be read aloud; the user explicitly confirms before the
active image-capable provider paints the sequence. The provider is reminded of
the complete story for every moment so recurring characters and colors remain
coherent. While it works, a determinate track names the exact moment, marks
completed moments and keeps Cancel and Escape available. Stopping is immediate:
the active request is asked to stop, later moments never begin and even a late
provider reply is discarded. All pictures must succeed before the complete
captioned frame batch lands as one undoable change. Full behavior is in
`features/animation.md`.

### The free tier

**20 free Dream AI tries per day** (local calendar day, rolls over at
midnight), counted across Create/Edit/Feedback, **one complete built-in
storyboard**, and the **make-real code export** (`features/app-mode.md`) and
shown subtly in the
panel ("N free tries left today"). At zero: "That is all the free dreams
for today! Add your own AI in Settings below for unlimited magic."
Connecting your own provider makes the counter disappear — unlimited when it
can paint. An active assistant without image creation falls back to Dream AI
for a storyboard, so that storyboard uses one built-in try and says which
painter will be used before confirmation.

## Code generation (make real)

The **Real code (AI)** export (`features/app-mode.md`) is the assistant's
fourth capability, exercised from the export dialog rather than the panel:

- Any **chat-capable provider** can write the code: the app is described
  structurally (screens, texts, shape boxes and the navigation graph), with
  imported and AI-made raster images included as inline PNGs. The provider
  replies with ONE self-contained HTML file. The conversation may open with
  a system message that steers this task.
- **Dream AI** generates the code itself with a deterministic local
  template — free, offline, honestly labeled — counting against the free
  tier as above; BYOK stays unlimited.
- Replies that are not one self-contained HTML document (external web
  references are never allowed) are rejected with a friendly error
  suggesting a retry or the deterministic interactive-app export.

## BYOK — bring your own key

In the panel's Settings, point Dream at any **OpenAI-compatible endpoint**:
base URL, chat model, API key, a visible **Image model** plus "This AI can
also paint images" for endpoints with image generation, and an optional
**Edits model** for endpoints with image editing. The current OpenAI example
for both image fields is `gpt-image-2`.

Choosing the own-AI option keeps that choice visible while its first setup is
incomplete. Create remains unavailable and explains that Save is required, so
no prompt can silently run through the offline provider instead. After a
provider has been saved, switching away and back activates it immediately
without requiring another Save. The provider named in Settings always matches
the visible choice; a successful Save confirms the active connection.

- **Chat** (feedback) goes to `/chat/completions`; **image creation** to
  `/images/generations`. Compatible endpoints receive the requested document
  size. At the official OpenAI endpoint, a blank image model uses
  `gpt-image-2`; GPT Image requests use a valid efficient draft size and the
  returned pixels are normalized to the document's exact dimensions.
- **Image editing** goes to `/images/edits` only when the Edits model is
  non-empty. Blank means no edit capability: the Edit tab says so kindly and
  offers Dream AI's offline filters. Image-less endpoints disable Create the
  same way.
- **Test connection** validates URL/key/model with one cheap round-trip
  and reports success ("It works! Your AI said hello back.") or a friendly,
  jargon-free error ("Could not reach … — is the URL right and the app
  running?", "the API key was rejected — check it and try again", "that
  endpoint was not found — check the base URL and model name"). While waiting,
  it names the contacting and checking stages without inventing a percentage.
  Cancel returns Settings to ready immediately, asks the endpoint to stop,
  confirms settings were unchanged and ignores a late hello.
- **Key handling (rules):** keys live in **session-only storage by
  default** (gone when the app closes); "Remember key on this device" opts
  into device storage; keys are sent only as the authorization header to
  the configured endpoint, are **never logged**, never appear in error
  messages, and never land in the settings blob. Settings (URL, chat/image/
  edits models, toggles, active provider) persist on-device. A Real Code
  request includes inline pixels for visible raster images because those
  pixels are required in the self-contained result; other marks remain a
  compact structural description.
- Known-good starting points: OpenRouter
  (`https://openrouter.ai/api/v1`, e.g. `openai/gpt-4o-mini`), Ollama
  (`http://localhost:11434/v1`, e.g. `llama3.1`, no key needed), LM Studio
  (`http://localhost:1234/v1`, the loaded model).

## Kid mode

The AI panel simplifies to a single Create box with a giant mic and a big
"Make it!" button — no tabs, no settings. A separate always-visible **Tell a
story!** control opens the confirmable story-to-animation journey with the same
giant dictation control and read-aloud moments.

## Edge cases

- A busy assistant ignores further requests until the current one finishes or
  is cancelled.
- If an edit service returns a different image size, Dream fits it back to
  the active layer before applying it; a selected edit still cannot change
  pixels outside its box.
- Provider errors surface verbatim when friendly, else "Hmm, that did not
  work. Try again?"
- An empty AI answer → "The AI answered, but said nothing. Try again?"
- Free-tier bookkeeping failure never blocks creation (fail-open).
- Feedback Apply on an empty layer explains itself instead of failing.
