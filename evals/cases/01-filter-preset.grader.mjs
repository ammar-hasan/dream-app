/**
 * Grader for eval 01 — a real "Sunset" filter preset in both locales.
 * Static checks first; runtime vitest only runs when the statics pass.
 */
export async function grade(ctx) {
  const reasons = [];

  const filters = ctx.read('src/engine/filters.ts') ?? '';
  if (!/id:\s*'sunset'/.test(filters)) {
    reasons.push("FILTER_PRESETS in src/engine/filters.ts has no preset with id 'sunset'");
  } else {
    const block = filters.match(/id:\s*'sunset'[\s\S]{0,400}?adjustments:\s*\{([^}]*)\}/);
    if (!block || !/[1-9]/.test(block[1])) {
      reasons.push(
        "the 'sunset' preset applies no non-zero adjustment — a no-op preset is not a look",
      );
    }
  }

  if (!ctx.grep('src/ui/i18n/en.ts', /'adjust\.preset\.sunset':/)) {
    reasons.push("src/ui/i18n/en.ts is missing the 'adjust.preset.sunset' key");
  }
  if (!ctx.grep('src/ui/i18n/ar.ts', /'adjust\.preset\.sunset':\s*'[^']*[؀-ۿ]/)) {
    reasons.push("src/ui/i18n/ar.ts is missing 'adjust.preset.sunset' with an Arabic value");
  }

  if (!/sunset/i.test(ctx.read('src/engine/filters.test.ts') ?? '')) {
    reasons.push('src/engine/filters.test.ts was not updated to cover the sunset preset');
  }

  if (reasons.length > 0) return { pass: false, reasons };

  const vitest = ctx.run('npx', [
    'vitest',
    'run',
    'src/engine/filters.test.ts',
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
