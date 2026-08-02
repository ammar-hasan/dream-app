# Eval 03 — A "hero speed" setting for the Catch! game template

Difficulty: ★★★ (document model + pure game core + store + panel + i18n)

## Task

Play mode's Catch! template has three difficulty knobs on the document
(`GameSettings` in `src/engine/types.ts`: `fallSpeed`, `spawnInterval`,
`lives`), clamped by `clampGameSettings` in `src/game/core.ts`, edited via
sliders in `src/ui/PlayPanel.tsx`. Add a fourth knob:

- **`heroSpeed`** — a multiplier for how fast the hero (the catcher) moves
  left/right. Default `1`, sensible range 0.5–2.

Requirements:

- Read `AGENTS.md` first.
- Add `heroSpeed: number` to `GameSettings`; default it in
  `DEFAULT_GAME_SETTINGS` and the kid-mode defaults in `src/game/core.ts`;
  clamp it in `clampGameSettings`. The schema is additive — old saves
  without the field must still load (see how the existing settings handle
  this) and `src/engine/projectFile.ts` round-trips must keep working.
- Use it in the game core: the hero's movement speed in `tick` multiplies by
  `heroSpeed`.
- Add a slider to `src/ui/PlayPanel.tsx` next to the others, labelled via a
  new `play.heroSpeed` key in BOTH `src/ui/i18n/en.ts` and
  `src/ui/i18n/ar.ts`.
- Extend the tests: `src/game/core.test.ts` (clamping + movement speed
  effect) and any store/settings tests that enumerate settings.
- Done when `npm run check` is green. Do not commit.

## Grader

Deterministic, in `03-game-hero-speed.grader.mjs`:

1. `GameSettings` in `src/engine/types.ts` declares `heroSpeed`.
2. `src/game/core.ts` defaults AND clamps it (both `DEFAULT_GAME_SETTINGS`
   and `clampGameSettings` mention it).
3. `src/ui/PlayPanel.tsx` exposes it and the `play.heroSpeed` key exists in
   both string tables, Arabic value in Arabic script.
4. `src/game/core.test.ts` covers it.
5. Runtime: `npx vitest run src/game src/store/game.test.ts src/engine/projectFile.test.ts src/ui/i18n/i18n.test.ts`
   passes.

Plus the shared gate: `npm run check` must pass.
