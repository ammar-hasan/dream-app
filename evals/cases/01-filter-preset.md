# Eval 01 — Add a "Sunset" filter preset

Difficulty: ★ (single module + string tables + one test update)

## Task

Dream's Adjust panel has four one-tap filter presets (B&W, Vintage, Cool,
Warm). Add a fifth: **Sunset** — a warm golden-hour look.

- Read `AGENTS.md` first; follow its conventions.
- Add the preset to `FILTER_PRESETS` in `src/engine/filters.ts` with
  `id: 'sunset'` and `label: 'Sunset'`. It must be a real look: at least one
  adjustment meaningfully different from `DEFAULT_ADJUSTMENTS` (the existing
  Warm preset combines sepia + saturation + brightness; Sunset should push
  warm tones its own way — your choice of values).
- The panel renders preset labels as `t(`adjust.preset.${preset.id}`)`
  (`src/ui/AdjustPanel.tsx`), so add the `adjust.preset.sunset` key to BOTH
  `src/ui/i18n/en.ts` and `src/ui/i18n/ar.ts` (the Arabic value must actually
  be Arabic — tests assert en↔ar key parity).
- Update `src/engine/filters.test.ts`: the preset-list test currently asserts
  exactly four presets — extend it to cover Sunset.
- Done when `npm run check` is green. Do not commit.

## Grader

Deterministic, in `01-filter-preset.grader.mjs`:

1. `src/engine/filters.ts` contains a preset with `id: 'sunset'` whose
   `adjustments` object has at least one non-zero value (a no-op preset is
   not a look).
2. `adjust.preset.sunset` exists in `en.ts`, and in `ar.ts` with an Arabic
   (U+0600–U+06FF) value.
3. `filters.test.ts` mentions the new preset (the test was actually updated).
4. Runtime: `npx vitest run src/engine/filters.test.ts src/ui/i18n/i18n.test.ts`
   passes.

Plus the shared gate: `npm run check` must pass.
