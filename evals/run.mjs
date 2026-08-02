#!/usr/bin/env node
/**
 * Dream agent-eval harness — deterministic graders for agent tasks.
 *
 *   node evals/run.mjs --selftest                       verify the harness itself
 *   node evals/run.mjs --case 01                        grade the current tree against case 01
 *   node evals/run.mjs --case 01 --agent "claude -p …"  run an agent first, then grade
 *   node evals/run.mjs --all [--skip-check]             grade every case
 *
 * Grading = the shared gate (`npm run check`, unless --skip-check) plus the
 * per-case grader evals/cases/<name>.grader.mjs, which must export
 * `async grade(ctx) → { pass: boolean, reasons: string[] }`.
 *
 * --selftest proves the harness is honest: on a tree where a case's feature
 * is NOT implemented, its grader must fail with reasons (a grader that
 * passes an untouched tree is gameable or the feature already shipped).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const casesDir = path.join(root, 'evals', 'cases');

function parseArgs(argv) {
  const opts = { selftest: false, all: false, skipCheck: false, caseId: null, agent: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--selftest') opts.selftest = true;
    else if (arg === '--all') opts.all = true;
    else if (arg === '--skip-check') opts.skipCheck = true;
    else if (arg === '--case') opts.caseId = argv[++i];
    else if (arg === '--agent') opts.agent = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  return opts;
}

function listCases() {
  return readdirSync(casesDir)
    .filter((f) => /^\d+-[\w-]+\.md$/.test(f))
    .sort()
    .map((f) => ({
      id: f.split('-')[0],
      name: f.replace(/\.md$/, ''),
      caseFile: path.join(casesDir, f),
      graderFile: path.join(casesDir, f.replace(/\.md$/, '.grader.mjs')),
    }));
}

function makeCtx(caseInfo) {
  const read = (rel) => {
    const p = path.join(root, rel);
    return existsSync(p) ? readFileSync(p, 'utf8') : null;
  };
  return {
    root,
    caseId: caseInfo.id,
    caseName: caseInfo.name,
    /** Absolute path for a repo-relative path. */
    abs: (rel) => path.join(root, rel),
    /** File content (utf8) or null when missing. */
    read,
    exists: (rel) => existsSync(path.join(root, rel)),
    /** True when the file exists and matches the regex. */
    grep: (rel, re) => {
      const content = read(rel);
      return content !== null && re.test(content);
    },
    /** Run a command; never throws. → { ok, code, output }. */
    run(cmd, args = [], opts = {}) {
      const res = spawnSync(cmd, args, {
        cwd: opts.cwd ?? root,
        encoding: 'utf8',
        timeout: opts.timeout ?? 10 * 60 * 1000,
      });
      const output = `${res.stdout ?? ''}${res.stderr ?? ''}`;
      const code = res.status ?? (res.error ? -1 : 1);
      return { ok: code === 0, code, output };
    },
  };
}

async function loadGrader(caseInfo) {
  if (!existsSync(caseInfo.graderFile)) {
    throw new Error(`missing grader: ${path.relative(root, caseInfo.graderFile)}`);
  }
  const mod = await import(pathToFileURL(caseInfo.graderFile).href);
  if (typeof mod.grade !== 'function') {
    throw new Error(`${caseInfo.name}: grader must export async grade(ctx)`);
  }
  return mod.grade;
}

function checkResultShape(caseInfo, result) {
  if (!result || typeof result.pass !== 'boolean' || !Array.isArray(result.reasons)) {
    throw new Error(`${caseInfo.name}: grade() must return { pass: boolean, reasons: string[] }`);
  }
}

async function selftest(cases) {
  console.log(`selftest: ${cases.length} case(s)\n`);
  let failures = 0;
  for (const c of cases) {
    const problems = [];
    const md = readFileSync(c.caseFile, 'utf8');
    if (!md.includes('## Task')) problems.push('case file has no "## Task" section');
    if (!md.includes('## Grader')) problems.push('case file has no "## Grader" section');
    let result = null;
    try {
      const grade = await loadGrader(c);
      result = await grade(makeCtx(c));
      checkResultShape(c, result);
    } catch (err) {
      problems.push(`grader threw: ${err.message}`);
    }
    if (result) {
      if (result.pass) {
        problems.push(
          'grader PASSES on the current tree — either the feature already shipped ' +
            '(retire or rewrite this eval) or the grader is gameable',
        );
      }
      if (!result.pass && result.reasons.length === 0) {
        problems.push('grader failed without reasons — reasons are required');
      }
    }
    if (problems.length > 0) {
      failures += 1;
      console.log(`✗ ${c.name}`);
      for (const p of problems) console.log(`    - ${p}`);
    } else {
      console.log(
        `✓ ${c.name} (grader fails the untouched tree with ${result.reasons.length} reason(s), as expected)`,
      );
    }
  }
  console.log(
    failures === 0 ? '\nharness OK' : `\n${failures} case(s) have a broken or gameable grader`,
  );
  return failures === 0;
}

async function gradeCases(cases, opts) {
  if (opts.agent) {
    console.log(`running agent: ${opts.agent}\n`);
    const res = spawnSync(opts.agent, { cwd: root, stdio: 'inherit', shell: true });
    if (res.status !== 0) {
      console.error(`agent command exited with code ${res.status}`);
      process.exit(1);
    }
  }
  let gateOk = true;
  if (!opts.skipCheck) {
    console.log('shared gate: npm run check\n');
    const res = spawnSync('npm', ['run', 'check'], { cwd: root, stdio: 'inherit' });
    gateOk = res.status === 0;
    if (!gateOk) console.log('\nshared gate FAILED — running graders anyway for full feedback\n');
  }
  let allPass = gateOk;
  for (const c of cases) {
    const grade = await loadGrader(c);
    const result = await grade(makeCtx(c));
    checkResultShape(c, result);
    allPass = allPass && result.pass;
    console.log(result.pass ? `✓ ${c.name}` : `✗ ${c.name}`);
    for (const r of result.reasons) console.log(`    - ${r}`);
  }
  console.log(allPass ? '\nPASS' : '\nFAIL');
  return allPass;
}

const opts = parseArgs(process.argv.slice(2));
const cases = listCases();
if (opts.selftest) {
  process.exit((await selftest(cases)) ? 0 : 1);
}
let selected = cases;
if (opts.caseId) {
  selected = cases.filter((c) => c.id === opts.caseId || c.name === opts.caseId);
  if (selected.length === 0) {
    console.error(
      `unknown case "${opts.caseId}" — available: ${cases.map((c) => c.name).join(', ')}`,
    );
    process.exit(1);
  }
} else if (!opts.all) {
  console.error('usage: run.mjs --selftest | --case <id> [--agent "<cmd>"] [--skip-check] | --all');
  process.exit(1);
}
process.exit((await gradeCases(selected, opts)) ? 0 : 1);
