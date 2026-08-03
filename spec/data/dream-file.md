# The `.dream` file format (v1)

The portable project file: one self-contained UTF-8 JSON document that any
implementation of Dream must read and write identically. This file is the
compatibility contract between implementations (app, agent tooling,
rebuilds).

## Envelope

```json
{
  "format": "dream-project",
  "version": 1,
  "document": { "id": "…", "width": 1024, "height": 768, "layers": [ … ] }
}
```

- `format` is exactly `"dream-project"`. `version` is `1`.
- `document` is the document schema (`document-schema.md`) verbatim,
  including the frame invariant (serialized `layers` mirrors the active
  frame's stack).
- **One transformation:** raster payloads (`patch.data` on fill and image
  operations) are base64 **PNG data URLs** (`data:image/png;base64,…`)
  instead of raw bytes — readable by anything with a PNG decoder. Patch
  `x/y/width/height` remain plain numbers.

## Forward-compatibility rule

- **Readers must ignore fields they don't know** — at every level
  (envelope, document, frame, layer, operation).
- **Writers must round-trip unknown document content**: a document read,
  edited and re-exported preserves unknown fields on the document, frames,
  layers and operations. Unknown envelope extensions are ignored because the
  envelope is transport metadata rather than document content.
- Version bumps are additive where possible; a breaking change increments
  `version`. Readers refuse newer major versions (see errors below).

## Reader validation

A reader must reject, with a human-readable error, in these cases (message
texts are the contract for the web implementation; other implementations
should be equally plain):

| Violation                              | Error                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Not JSON                               | `Not a .dream file: invalid JSON`                                        |
| JSON isn't an object                   | `Not a .dream file: expected a JSON object`                              |
| `format` mismatch                      | `Not a .dream file: missing format "dream-project"`                      |
| `version` ≠ 1                          | `Unsupported .dream version: {v}`                                        |
| `document` missing/not an object       | `Corrupt .dream file: missing document`                                  |
| `width`/`height` not numeric           | `Corrupt .dream file: document has no size`                              |
| Malformed frame entry                  | `Corrupt .dream file: bad frame`                                         |
| `layers` not an array                  | `Corrupt .dream file: layers must be an array`                           |
| Layer without an `operations` array    | `Corrupt .dream file: layer is missing operations`                       |
| Raster op without a PNG string payload | `Corrupt .dream file: raster op "{id}" has no PNG payload`               |
| Raster op without numeric patch size   | `Corrupt .dream file: raster op "{id}" has no patch size`                |
| Decoded PNG size ≠ declared patch size | `Corrupt .dream file: raster op "{id}" PNG is {a}×{b}, expected {w}×{h}` |

## Known fidelity caveat

Raster pixels are stored premultiplied-alpha through PNG encoding (true of
standard image codecs): **semi-transparent raster pixels are lossy by a
rounding step** on a save/load round-trip; fully opaque pixels round-trip
exactly. Vector content (strokes, shapes, text) is always exact.

## In the product

- **Export → Dream project (.dream)** downloads `{name}.dream`.
- **The Open dialog** opens `.dream` files via a file picker or by
  drag-and-drop onto the dialog, alongside the on-device library; a broken
  file shows a plain-language error and changes nothing. Opening names file
  reading, image/layer/frame restoration and a longer wait with an
  indeterminate loader. Cancel returns the dialog to ready immediately,
  preserves the current project exactly and prevents a late file or saved
  project from replacing it.
