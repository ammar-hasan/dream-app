/**
 * Grader for eval 02 — "zoom in / zoom out" voice commands in both locales.
 * Static checks first; runtime vitest only runs when the statics pass.
 */
const ARABIC = /[؀-ۿ]/;

export async function grade(ctx) {
  const reasons = [];

  const parser = ctx.read('src/ai/voiceCommands.ts') ?? '';
  if (!/'zoom-in'/.test(parser) || !/'zoom-out'/.test(parser)) {
    reasons.push(
      "voiceCommands.ts: no 'zoom-in'/'zoom-out' intent kinds in the VoiceCommand union",
    );
  }
  const enBlock = (parser.match(/const EN_VOCAB[\s\S]*?\n\};/) ?? [''])[0];
  const arBlock = (parser.match(/const AR_VOCAB[\s\S]*?\n\};/) ?? [''])[0];
  for (const field of ['zoomIn', 'zoomOut']) {
    if (!new RegExp(`${field}:\\s*new Set\\(\\[`).test(enBlock)) {
      reasons.push(`EN_VOCAB is missing a ${field} trigger set`);
    }
    if (!new RegExp(`${field}:\\s*new Set\\(\\[[^\\]]*[؀-ۿ]`).test(arBlock)) {
      reasons.push(`AR_VOCAB.${field} is missing Arabic trigger words`);
    }
  }

  const executor = ctx.read('src/ui/voiceExecutor.ts') ?? '';
  if (!/\.zoomIn\(\)/.test(executor) || !/\.zoomOut\(\)/.test(executor)) {
    reasons.push('voiceExecutor.ts does not call store.zoomIn() / store.zoomOut()');
  }
  if (!ctx.grep('src/ui/i18n/en.ts', /'voice\.zoom\w*':/)) {
    reasons.push('en.ts is missing voice.zoom* feedback strings');
  }
  if (!ctx.grep('src/ui/i18n/ar.ts', /'voice\.zoom\w*':\s*'[^']*[؀-ۿ]/)) {
    reasons.push('ar.ts is missing Arabic voice.zoom* feedback strings');
  }

  const tests = ctx.read('src/ai/voiceCommands.test.ts') ?? '';
  if (!/zoom in/i.test(tests)) {
    reasons.push('voiceCommands.test.ts has no English "zoom in" case');
  }
  const lines = tests.split('\n');
  const arabicZoomTest = lines.some(
    (line, i) =>
      /zoom-(in|out)/.test(line) &&
      lines.slice(Math.max(0, i - 5), i + 1).some((l) => ARABIC.test(l)),
  );
  if (!arabicZoomTest) {
    reasons.push('voiceCommands.test.ts has no Arabic zoom phrase test');
  }

  if (reasons.length > 0) return { pass: false, reasons };

  const vitest = ctx.run('npx', [
    'vitest',
    'run',
    'src/ai/voiceCommands.test.ts',
    'src/ui/voiceExecutor.test.ts',
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
