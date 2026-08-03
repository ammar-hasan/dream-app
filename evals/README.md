# Dream agent evals

A small, deterministic harness for grading AI-agent tasks against this repo.
Each case is a self-contained feature task of increasing difficulty; each
grader checks the repo for REAL evidence of the change (source, both string
tables, updated tests) and then runs targeted tests. Graders never trust
prose — only files and exit codes.

## Run

```bash
npm run evals                                    # harness smoke test (no agent, no feature work)
node evals/run.mjs --case 01                     # grade the current tree against case 01
node evals/run.mjs --case 02 --agent "claude -p "$(cat evals/cases/02-voice-zoom.md)  # agent then grade
node evals/run.mjs --all --skip-check            # grade everything, skip the slow shared gate
```

What a grading run does:

1. Optionally runs your agent command (`--agent`, any CLI: `claude -p …`,
   `codex exec …`, `kimi …`). The agent works directly in the current tree.
2. Runs the shared gate `npm run check` (skip with `--skip-check`). Even if
   the gate fails, the case graders still run so you get full feedback.
3. Runs the case's grader (`evals/cases/<name>.grader.mjs`). Static evidence
   first; targeted vitest/behavioral checks only run when the statics pass.

Exit code is non-zero when the gate or any grader fails.

`npm run evals` runs `--selftest`: it validates every case file and grader,
and asserts each grader FAILS on the current (feature-not-implemented) tree
with real reasons. A grader that passes an untouched tree is gameable — or
the feature has since shipped for real and the eval should be retired.

## The cases

| Case                   | Task                                | Exercises                                   |
| ---------------------- | ----------------------------------- | ------------------------------------------- |
| `01-filter-preset`     | Add a "Sunset" filter preset        | engine data + i18n parity + test update     |
| `02-voice-zoom`        | "zoom in / zoom out" voice commands | pure parser + executor + en/ar vocabularies |
| `03-game-hero-speed`   | A `heroSpeed` Catch! setting        | document model + game core + store + panel  |
| `04-mcp-import-raster` | A `dream.import_raster` MCP tool    | standalone package: binary input + protocol |

## Add an eval

1. Write `evals/cases/NN-short-name.md` with two sections: `## Task` (the
   exact prompt handed to the agent — self-contained, pins names and file
   paths where the grader depends on them) and `## Grader` (human-readable
   spec of what is checked).
2. Write `evals/cases/NN-short-name.grader.mjs` exporting:

   ```js
   export async function grade(ctx) {
     const reasons = [];
     // …push a reason for every piece of missing evidence…
     return { pass: reasons.length === 0, reasons };
   }
   ```

   `ctx` provides: `root`, `caseId`, `caseName`, `abs(rel)`, `read(rel)`,
   `exists(rel)`, `grep(rel, regex)`, and `run(cmd, args, {cwd, timeout})`
   (never throws; → `{ ok, code, output }`).

3. Keep it honest: check for evidence a trivial edit can't fake (both
   locales, updated tests, behavioral runs of the built artifact), and keep
   it deterministic (no network, no clocks, no LLM judging).
4. Verify with `npm run evals` — your new grader must FAIL the untouched
   tree with clear reasons, then PASS once the task is genuinely done.
