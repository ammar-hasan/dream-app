---
name: verify-release
description: Run Dream's full release gate sequence — check, coverage, e2e with the macOS-only visual baseline rules, check:mcp — and prepare a release via scripts/release.mjs. Use before any release, tag, big PR, or when asked whether the tree is shippable.
---

# Verify a Dream release

The gates, in order. Stop at the first red one; a release never ships around
a red gate.

## Gate sequence

1. `git status` — the release script requires a clean tree. Report (don't
   clean up) uncommitted work.
2. `npm run check` — typecheck + lint + unit tests + build. The always gate;
   what CI runs on every PR.
3. `npm run test:coverage` — engine coverage must stay ≥80%
   lines/functions/statements.
4. `npm run test:e2e` — the Playwright suite (builds + previews the
   production bundle first).
5. `npm run check:mcp` — installs, builds and tests `mcp-server/` (separate
   dependency tree; root `check` never touches it).

Steps 2+4+5 together are `npm run check:full` plus `npm run check:mcp`.

## Visual baseline rules (read before touching e2e)

- `e2e/visual.spec.ts` holds ONE committed full-page screenshot baseline of
  the welcome state, with deliberately generous thresholds — it is a
  CSS-regression guard, not pixel-diffing.
- The baseline is **macOS-only**: font anti-aliasing differs across OSes, so
  **CI skips the visual spec via `--grep-invert`** (see the Playwright job in
  `.github/workflows/ci.yml`).
- Regenerate ONLY after an intentional UI change, on macOS:
  `npx playwright test --update-snapshots`, then eyeball the new PNG in
  `e2e/visual.spec.ts-snapshots/`. Never rebaseline to make a red run go
  green — find the regression instead.

## Release prep

`npm run release -- patch|minor|major` verifies the clean tree, re-runs
`npm run check`, bumps the version (+ lockfile copies) and seeds the
CHANGELOG skeleton — then prints the exact git commands. It never commits,
tags or pushes; neither do you without explicit approval. Fill in real
CHANGELOG bullets before handing the git commands to the human.
