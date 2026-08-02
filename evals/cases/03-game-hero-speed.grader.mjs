/**
 * Grader for eval 03 — a clamped, defaulted, UI-exposed heroSpeed setting.
 * Static checks first; runtime vitest only runs when the statics pass.
 */
export async function grade(ctx) {
  const reasons = [];

  const types = ctx.read('src/engine/types.ts') ?? '';
  const settingsBlock = (types.match(/interface GameSettings\s*\{[^}]*\}/) ?? [''])[0];
  if (!/heroSpeed/.test(settingsBlock)) {
    reasons.push('GameSettings in src/engine/types.ts does not declare heroSpeed');
  }

  const core = ctx.read('src/game/core.ts') ?? '';
  const defaults = (core.match(/DEFAULT_GAME_SETTINGS[\s\S]{0,300}?\};/) ?? [''])[0];
  if (!/heroSpeed/.test(defaults)) {
    reasons.push('src/game/core.ts: DEFAULT_GAME_SETTINGS has no heroSpeed default');
  }
  const clamp = (core.match(/clampGameSettings[\s\S]{0,900}?\}\);?\n\}/) ?? [''])[0];
  if (!/heroSpeed/.test(clamp)) {
    reasons.push('src/game/core.ts: clampGameSettings does not clamp heroSpeed');
  }

  if (!ctx.grep('src/ui/PlayPanel.tsx', /heroSpeed/)) {
    reasons.push('src/ui/PlayPanel.tsx does not expose a heroSpeed slider');
  }
  if (!ctx.grep('src/ui/i18n/en.ts', /'play\.heroSpeed':/)) {
    reasons.push("en.ts is missing the 'play.heroSpeed' label");
  }
  if (!ctx.grep('src/ui/i18n/ar.ts', /'play\.heroSpeed':\s*'[^']*[؀-ۿ]/)) {
    reasons.push("ar.ts is missing an Arabic 'play.heroSpeed' label");
  }

  if (!/heroSpeed/.test(ctx.read('src/game/core.test.ts') ?? '')) {
    reasons.push('src/game/core.test.ts was not updated to cover heroSpeed');
  }

  if (reasons.length > 0) return { pass: false, reasons };

  const vitest = ctx.run('npx', [
    'vitest',
    'run',
    'src/game',
    'src/store/game.test.ts',
    'src/engine/projectFile.test.ts',
    'src/ui/i18n/i18n.test.ts',
  ]);
  if (!vitest.ok) {
    reasons.push(`targeted vitest failed:\n${tail(vitest.output)}`);
  }
  return { pass: reasons.length === 0, reasons };
}

function tail(output) {
  return output.trim().split('\n').slice(-25).join('\n');
}
