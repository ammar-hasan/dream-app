# Integrations — the external surface

Everything Dream exposes to or consumes from the outside world, as
contracts. Tool names, field names and file-format spellings in this file
ARE the contract.

## AI provider protocol

A provider is anything that can declare and deliver capabilities:

| Capability      | Meaning                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `generateImage` | prompt (+ desired size) → a pixel image                                                                                         |
| `editImage`     | prompt + an existing image (+ optional region) → modified pixels                                                                |
| `chat`          | a conversation (used for design feedback and the make-real code generation; messages may carry a system role to steer the task) |

Rules:

1. Providers **declare capabilities up front**; the UI degrades per
   declaration (an image-less provider disables Create; the Edit tab is
   Dream-AI-only when the provider can't edit) and always offers the
   working alternative.
2. **Dream AI** (built-in) declares all three, is free, offline and
   deterministic (`features/ai.md`).
3. **OpenAI-compatible BYOK** uses up to three endpoints of the configured
   base URL: `POST /chat/completions` (feedback, with a system prompt that
   frames Dream as "a kind and clever friend inside a simple drawing
   app") and `POST /images/generations` (`n: 1` plus the configured image
   model). Generic compatible endpoints receive the requested `size: "WxH"`
   and `response_format: 'b64_json'`. GPT Image requests use supported sizes,
   omit the legacy response-format field and request an efficient draft;
   the official OpenAI endpoint defaults a blank image model to
   `gpt-image-2`. Returned pixels are normalized to the requested document
   size. When and only when an edits model is configured, `editImage` is
   declared true and uses `POST /images/edits`:
   multipart `model`, `prompt`, PNG `image` (or the current GPT Image array
   form), and a same-size PNG `mask` with an alpha channel. Transparent mask
   pixels identify the requested replacement area; opaque pixels are kept.
   The response supplies base64 image data. A blank edits model makes no
   request and declares no edit capability.
4. Requests carry the key only as an `Authorization: Bearer` header to the
   configured endpoint. Keys follow the secrecy rules in
   `features/ai.md` (session-only by default, never logged).
5. Free tier: the built-in provider allows 20 tries/day; any active BYOK
   provider is unlimited.
6. Errors are surfaced in plain language (see the message list in
   `features/ai.md`); provider plumbing details never reach the user.
7. A confirmed storyboard sends one image-generation request per reviewed
   moment, in story order, at the exact document dimensions. Every request
   includes the complete story, the current moment and its position in the
   sequence, with instructions to preserve recurring visual identity and omit
   lettering. All responses are collected before the document changes. An
   image-capable BYOK provider handles the sequence without a Dream AI charge;
   otherwise the named built-in fallback paints the whole storyboard for one
   free try.

## The agent surface (dream-mcp)

External agents (e.g. AI coding assistants) can operate on `.dream` files
through a companion tool server speaking the Model Context Protocol over
stdio. The tool names and their input/output shapes are the contract.

| Tool                   | Input                                                                                                                                                                                      | Output                                                                                                                                                                                                | Notes                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `dream.read_project`   | `path`                                                                                                                                                                                     | project summary: id, name, size, background, mode, layer count, frame count (null when unanimated), hotspot counts (total + broken), operation counts (total + per kind), game-setup flag, timestamps | read-only                                |
| `dream.create_project` | `path`, `width`, `height` (integers 1–8192); optional `background` (default `#ffffff`), `name` (default `Untitled`)                                                                        | the new project summary                                                                                                                                                                               | validates size and color                 |
| `dream.list_layers`    | `path`                                                                                                                                                                                     | per frame (or active stack): layer id, name, visibility, opacity, lock, operation count                                                                                                               |                                          |
| `dream.add_layer`      | `path`; optional `name` (default: next numbered layer)                                                                                                                                     | the new layer's id, name, stack index and active frame id                                                                                                                                             | adds at the top of the active stack      |
| `dream.update_layer`   | `path`, `layer` (id or name); at least one of `name` (non-empty), `visible`, `opacity` (0–1), `locked`, `index` (zero-based; 0 is bottom)                                                  | the resulting layer id, name, visibility, opacity, lock, operation count, stack index and active frame id                                                                                             | active frame only; index must exist      |
| `dream.remove_layer`   | `path`, `layer` (id or name)                                                                                                                                                               | removed layer id/name/index, remaining layer count and active frame id                                                                                                                                | refuses the final layer                  |
| `dream.add_text`       | `path`, `text`, `x`, `y`; optional `size` (default 24), `color` (default `#000000`), `fontFamily` (default `sans-serif`), `layer` (id or name; default top layer of the active frame)      | the new operation's id + its layer                                                                                                                                                                    | empty text rejected                      |
| `dream.add_shape`      | `path`, `shape` (`line`, `rectangle`, `ellipse`), `x1`, `y1`, `x2`, `y2`; optional `size` (default 2), `color` (default `#000000`), `opacity` (default 1), `fill` (default false), `layer` | the new operation's id + its layer                                                                                                                                                                    | zero-size shapes rejected                |
| `dream.render_png`     | `path`, `outPath`; optional `frame` index (default: the active stack)                                                                                                                      | the written file's path, dimensions and byte size                                                                                                                                                     | errors on out-of-range frame             |
| `dream.export_app`     | `path`, `outPath`                                                                                                                                                                          | the standalone HTML file's path, screen count, hotspot count, byte size                                                                                                                               | needs frames; starts at the active frame |

Rules:

1. The agent surface renders and validates with **the same document
   semantics as the app** — a `.dream` file it writes opens identically in
   the app, and vice versa.
2. It can add, rename, configure, reorder and safely remove layers, then append
   shapes or text to the active frame. Animated-project edits preserve the
   active stack mirror. It deliberately cannot draw freehand strokes, import
   raster content, edit hotspots/components or undo.
3. Tool failures return friendly errors, not protocol errors.
4. The same premultiplied-alpha caveat as the app applies to raster
   round-trips (`data/dream-file.md`).

## Import & export formats

| Format              | Direction         | Contract                                                                                                                                                                     |
| ------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PNG                 | import + export   | import: onto its own centered layer, scaled down to fit; export: flattened document, transparency preserved, `{name}.png`                                                    |
| JPEG                | export            | flattened, quality 10–100 (default 92), `{name}.jpg`                                                                                                                         |
| SVG                 | export            | active canvas/frame as scalable visible strokes, spray, shapes, connectors and text; unavailable when visible pixel or eraser content would make it misleading; `{name}.svg` |
| Clipboard image     | import            | paste lands like a file import                                                                                                                                               |
| Pasted CSV / TSV    | import to plot    | one header plus 2–200 numeric rows; first column is horizontal values, next 1–4 columns are measured series; quoted CSV labels accepted                                      |
| `.dream`            | import + export   | the portable project format — full contract in `data/dream-file.md`                                                                                                          |
| WebM                | export (animated) | 30 fps capture stream with authored frame holds; VP9 → VP8 → generic fallback; Original uses `{name}.webm`, social shapes add their suffix                                   |
| MP4                 | export (animated) | same timing through feature-detected native recording with a browser-compatible codec; Original uses `{name}.mp4`, social shapes add their suffix                            |
| Sprite sheet (PNG)  | export (animated) | all frames in one grid, ≤8 columns, `{name}-frames.png`                                                                                                                      |
| Standalone HTML app | export (animated) | the interactive-prototype contract in `features/app-mode.md`, `{name}-app.html`                                                                                              |
| Real-code HTML app  | export (animated) | the AI make-real contract in `features/app-mode.md`, `{name}-code.html`                                                                                                      |

Filenames use the document name, falling back to `dream` when blank.
