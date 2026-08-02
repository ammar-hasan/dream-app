/**
 * Release preparation. Deliberately performs NO git mutations — it verifies
 * the tree, bumps the version, seeds the CHANGELOG entry, then prints the
 * exact git commands for a human/agent to run.
 *
 *   npm run release -- patch|minor|major
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const bump = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error('Usage: npm run release -- patch|minor|major');
  process.exit(1);
}

// 1. A release always starts from a clean tree.
const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
if (dirty) {
  console.error('Working tree is not clean — commit or stash first:\n\n' + dirty);
  process.exit(1);
}

// 2. The full local gate must be green.
console.log('Running npm run check…\n');
const check = spawnSync('npm', ['run', 'check'], { stdio: 'inherit' });
if (check.status !== 0) {
  console.error('\nnpm run check failed — fix it before releasing.');
  process.exit(check.status ?? 1);
}

// 3. Bump the version (package.json + the two copies in package-lock.json).
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
const next =
  bump === 'major'
    ? `${major + 1}.0.0`
    : bump === 'minor'
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;
pkg.version = next;
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
lock.version = next;
if (lock.packages?.['']) lock.packages[''].version = next;
writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + '\n');

// 4. Seed a Keep-a-Changelog entry right after the Unreleased section.
const today = new Date().toISOString().slice(0, 10);
const entry = `## [${next}] - ${today}\n\n### Added\n\n- TODO: summarize what changed since the last release.\n`;
const changelogPath = 'CHANGELOG.md';
let changelog;
try {
  changelog = readFileSync(changelogPath, 'utf8');
} catch {
  changelog =
    '# Changelog\n\nAll notable changes to Dream are documented here. The format is\nbased on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).\n\n## [Unreleased]\n';
}
const lines = changelog.split('\n');
const firstVersion = lines.findIndex(
  (line) => line.startsWith('## [') && !line.startsWith('## [Unreleased]'),
);
if (firstVersion >= 0) lines.splice(firstVersion, 0, entry);
else lines.push('', entry);
writeFileSync(changelogPath, lines.join('\n'));

// 5. Hand the git ceremony back to a human/agent.
console.log(`
Prepared release v${next} — no git mutations were made.

Next steps:
  1. Fill in the TODO bullets in CHANGELOG.md.
  2. Run:
       git add package.json package-lock.json CHANGELOG.md
       git commit -m "Dream: release v${next}"
       git tag v${next}
       git push origin main --tags
`);
