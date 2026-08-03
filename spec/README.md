# The Dream Living Spec

This directory is the **living specification of Dream** — the product, not
the code that currently implements it. Read the tree and you know what Dream
is; build what it says and what you ship **is** Dream.

```
spec/
  README.md               ← you are here: the contract, the living rule, reading order
  product.md              ← vision, the 10 personas, design principles
  concepts.md             ← the domain model in product language (document … project)
  data/                   ← persistence as product contracts
    document-schema.md    ← every attribute of every concept: type, default, range
    storage.md            ← what persists where, and the storage-key contracts
    dream-file.md         ← the .dream file format (the compatibility contract)
  features/               ← one file per feature area, each: Purpose → Behavior →
    drawing.md              Exact details → Edge cases
    editing.md
    design-mode.md
    animation.md
    present.md
    play.md
    app-mode.md
    ai.md
    accessibility.md
    internationalization.md
    offline.md
  experience.md           ← the complete interaction map: modes, shortcuts,
                            voice intents, first-run, the exact user journeys
  visual-identity.md      ← the mark, color system, typography, spacing, motion, tone
  integrations.md         ← AI provider protocol, the agent (MCP) surface,
                            import/export formats
  acceptance.md           ← THE REBUILD CHECKLIST: behavioral criteria + the 10
                            end-to-end scenarios that prove a rebuild is faithful
```

## The rebuild contract

A skilled team — or an agent — with **only this directory** must be able to
recreate Dream in **any stack** (web, Flutter, Unity, Qt, …) and produce the
same product: same features, same behaviors, same look-and-feel, same data
semantics, same flows. To make that possible this spec is:

- **Complete on behavior.** What happens when you undo a mirrored stroke,
  what wand tolerance means perceptually, what the kid-mode defaults are —
  it's all here, with exact constants (colors, sizes, speeds, thresholds,
  counts) stated as product requirements.
- **Silent on implementation.** No file paths, module names, programming
  identifiers, frameworks, libraries, or build tooling. If a statement would
  be meaningless to someone rebuilding Dream in another stack, it does not
  belong here.
- **Exact where exactness matters.** Numbers are requirements, not
  illustrations. "Snap within 6 px" means 6 px.

The one deliberate exception: **data contracts**. Attribute names in
`concepts.md` / `data/document-schema.md`, the storage keys in
`data/storage.md`, the `.dream` envelope in `data/dream-file.md`, and the
tool names in `integrations.md` are spelled exactly as they appear on disk or
on the wire, because those spellings ARE the compatibility contract (a
`.dream` file written by one implementation must open in another). They are
labeled as such wherever they appear.

## The living rule

> **Any change to product behavior MUST update `spec/` in the same commit.**
> The spec describes the product, never the code. If you cannot point to the
> spec rule your change implements, the change isn't done.

This is a process rule, not machinery: there is deliberately **no tooling
that couples spec files to source paths**. Freshness comes from the rule
above being enforced in review, for humans and agents alike.

## Reading order

- **To understand the product:** `product.md` → `concepts.md` →
  `experience.md` → the `features/` file for your area.
- **To rebuild Dream:** `product.md` → `concepts.md` →
  `data/document-schema.md` → `data/dream-file.md` → every `features/` file →
  `visual-identity.md` → `integrations.md` → verify against `acceptance.md`.
- **To change the product:** the `features/` file for your area →
  `experience.md` (flows/shortcuts) → `acceptance.md` (add or update the
  criterion your change satisfies) — in the same commit as the change.

## Conventions

- **Canvas pixels** (also "document pixels") are the document's own
  coordinate units; screen pixels and zoom are presentation concerns.
- Colors are `#rrggbb` hex unless stated otherwise.
- **On-device** means data never leaves the user's machine: no account, no
  server, no sync. "Session-only" means gone when the app is closed.
- Every behavior rule is written to be testable: GIVEN/WHEN/THEN in
  `acceptance.md`, numbered imperatives in `features/`.
