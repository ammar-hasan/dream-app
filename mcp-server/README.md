# dream-mcp

<!-- mcp-name: io.github.ammar-hasan/dream-mcp -->

An MCP (Model Context Protocol) server that lets agents — Claude Code, Codex,
any MCP-capable client — work with **Dream** `.dream` project files: read
them, create them, edit them, render them to PNG, and export interactive HTML
prototypes.

It runs over stdio against the real Dream engine (compiled straight from the
root package's `src/engine` — no reimplementation), so a file written here is
byte-compatible with the browser app, and vice versa.

## Tools

| Tool                   | What it does                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `dream.read_project`   | Summary of a `.dream` file: size, background, mode, layer/frame counts, hotspots (incl. broken), op counts per kind, game setup. |
| `dream.create_project` | Create a new `.dream` file: `path`, `width`, `height`, optional `background`, `name`.                                            |
| `dream.list_layers`    | Layer stack(s): id, name, visibility, opacity, blend mode, lock, op count — plus a per-frame breakdown for animated documents.   |
| `dream.add_layer`      | Add a new top layer to the active frame, with an optional `name`.                                                                |
| `dream.update_layer`   | Rename, show/hide, set opacity/blend mode, lock/unlock or move a layer to a zero-based stack index.                              |
| `dream.remove_layer`   | Remove a layer by id or name from the active frame; refuses to remove the final layer.                                           |
| `dream.add_stroke`     | Append a validated brush/pencil/eraser polyline with optional pressure, style and target layer.                                  |
| `dream.add_text`       | Append a text op: `text`, `x`, `y`, optional `size`, `color`, `fontFamily`, `layer` (id or name; default: top layer).            |
| `dream.add_shape`      | Append a line/rectangle/ellipse with endpoints, optional size/color/opacity/fill, and an optional target `layer`.                |
| `dream.render_png`     | Flatten the document (or one `frame` index) to a PNG file.                                                                       |
| `dream.export_app`     | Export an animated document as ONE self-contained interactive HTML prototype (frames as screens, hotspots as tappable links).    |

## Setup

```bash
cd mcp-server
npm install
npm run check     # builds to dist/ and runs the test suite
```

The server entry point after building is
`mcp-server/dist/mcp-server/src/index.js` (the engine is compiled in from the
repository root, hence the nested path).

The package is prepared for public npm publication as
`@ammar-hasan/dream-mcp`, but local development does not require a published
artifact.

### Claude Code

```bash
claude mcp add dream -- node /absolute/path/to/dream-app/mcp-server/dist/mcp-server/src/index.js
```

### Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.dream]
command = "node"
args = ["/absolute/path/to/dream-app/mcp-server/dist/mcp-server/src/index.js"]
```

### Generic MCP client (JSON)

```json
{
  "mcpServers": {
    "dream": {
      "command": "node",
      "args": ["/absolute/path/to/dream-app/mcp-server/dist/mcp-server/src/index.js"]
    }
  }
}
```

## Try it without an MCP client

```bash
node examples/demo.mjs
```

creates a project in a tmp dir, adds/renames a layer, safely removes a scratch
layer, draws a rectangle and pressure stroke, adds text, reads the summary and
renders a PNG — the exact functions the MCP tools call.

## Registry publication

`server.json` follows the official MCP Registry schema and identifies the
server as `io.github.ammar-hasan/dream-mcp`. Package metadata contains the
matching `mcpName`; `npm pack --dry-run` builds, tests, and previews the exact
public tarball.

Publishing is intentionally a human-approved release step:

```bash
cd mcp-server
npm publish
mcp-publisher login github
mcp-publisher publish
```

The npm package must be public before the Registry will accept its metadata.

## How it fits the repo

- `src/tools.ts` — the tool cores: plain functions over the file system,
  fully unit-tested in tmp dirs (`src/tools.test.ts`). `src/index.ts` is a
  thin MCP stdio adapter over them.
- `src/nodeCodec.ts` — the Node `RasterCodec` for the `.dream` format and the
  frame renderer, backed by `@napi-rs/canvas` (native prebuilds, no DOM).
- The Dream engine itself (`../src/engine`) stays dependency-free; this
  package is the only place a canvas implementation is plugged into it. The
  webapp never imports `mcp-server/`.

## Notes & limits

- Canvas codecs premultiply alpha: a PNG round-trip of _semi-transparent_
  raster pixels is lossy by a rounding step (true of every canvas, browsers
  included). Opaque pixels round-trip exactly.
- Layer authoring targets the active frame; update/remove preserve its mirrored
  active stack, a layer can be addressed by id or name, and the final layer is
  never removable.
- Freehand authoring accepts 2–10,000 finite points, optional pressure samples,
  brush/pencil/eraser tools, color, size, opacity and an id/name layer target.
  Pressure uses the same width floor as pen input; pencil and eraser remain
  fully opaque like the app.
- `dream.export_app` needs an animated document (frames are the screens);
  documents without frames get a clear error.
- Rendering uses the headless skia build — text uses the fonts bundled with
  it, so glyph metrics can differ slightly from a browser's.
