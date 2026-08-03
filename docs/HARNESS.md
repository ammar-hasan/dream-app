# The Dream agent harness

Dream is built by AI agents as much as by humans. The harness is the
in-repo infrastructure that makes that safe, repeatable and verifiable —
the same gates and conventions for every contributor, carbon or silicon.
Nothing here is a new gate: every piece points at the existing ones
(`npm run check`, `check:full`, `check:mcp`).

## The pieces

| Piece                            | Path                        | Who uses it                                                                 |
| -------------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| Conventions (source of truth)    | `AGENTS.md`                 | everyone, read first                                                        |
| Bootstrap pointer + top-10 facts | `CLAUDE.md`                 | Claude Code sessions                                                        |
| Specialized subagents            | `.claude/agents/`           | Claude Code: `dream-engine`, `dream-ui`, `dream-verify`, `dream-release`    |
| Project skills                   | `.agents/skills/`           | any skill-capable agent: `implement-slice`, `verify-release`, `dogfood-mcp` |
| MCP wiring                       | `.mcp.json` + `mcp-server/` | MCP-capable agents get dream-mcp automatically (build: `npm run check:mcp`) |
| Agent evals                      | `evals/`                    | graders for agent tasks: `npm run evals`, `node evals/run.mjs --case NN`    |
| Bounded loops                    | `LOOPS.md` + `loops/`       | standing instructions for continuous agents                                 |

## How they fit together

```
                 ┌──────────────────────────────────────────┐
                 │            HUMAN / ORCHESTRATOR          │
                 │   picks work, approves anything public   │
                 └───────────────┬──────────────────────────┘
                                 │ hands a task / a loop prompt
                                 ▼
   LOOPS.md ─────────►  AGENT SESSION (Claude Code / Codex / Kimi)
   (standing prompt)    reads AGENTS.md (via CLAUDE.md pointer)
                                 │
        ┌────────────────────────┼─────────────────────────┐
        ▼                        ▼                         ▼
  .claude/agents/        .agents/skills/              .mcp.json
  dream-engine           implement-slice              dream-mcp server
  dream-ui               verify-release               (dogfooding: agents
  dream-verify           dogfood-mcp                   edit .dream files
  dream-release                                        with Dream's tools)
        │                        │                         │
        └────────────────────────┼─────────────────────────┘
                                 ▼
                      GATES (the only verdicts)
              npm run check · check:full · check:mcp
                                 │
                                 ▼
                  evals/ grade agent work deterministically
                  (npm run evals smoke-tests the graders)
                                 │
                                 ▼
              dream-verify reviews the diff vs AGENTS.md
                                 │
                                 ▼
        orchestrator commits/pushes · dream-release cuts releases
```

- **Humans** use the harness as documentation: `AGENTS.md` for conventions,
  this file for the map, `LOOPS.md` before letting an agent run
  continuously, `evals/` to benchmark a new agent or model against the repo.
- **Agents** use it as procedure: read the conventions, follow the slice
  skill, prove with the gates, hand off uncommitted. The dream-verify
  subagent is the independent check — the agent that wrote the code is
  never the one that approves it.
- **Loops** are the only standing autonomy, and they are bounded: one slice
  or one fix per cycle, a gate as the feedback check, a named stop rule,
  and an explicit approval boundary for anything public-facing.

## How we dogfood

Dream ships its own MCP server (`mcp-server/`, wired into this repo via
`.mcp.json`), so the agents developing Dream use Dream's own developer
surface: they create, edit, render and export `.dream` files with
`dream.create_project`, `dream.add_layer`, `dream.update_layer`,
`dream.remove_layer`, `dream.add_shape`, `dream.add_text`, `dream.render_png`
and friends — the same tools external users get. That means every agent session also
exercises the slice-14 developer surface for real. The `dogfood-mcp` skill
is the verification ritual: `npm run check:mcp`, `node mcp-server/examples/demo.mjs`,
then a live tool round-trip against a real file. If the MCP server breaks,
the harness feels it first.

## Conventions

- Subagents and skills are Markdown with YAML frontmatter (`name`,
  `description`, and `tools` for subagents). Keep them short pointers into
  `AGENTS.md`, not copies of it.
- Eval graders are deterministic (no network, no clocks, no LLM judging)
  and must fail the untouched tree — `npm run evals` enforces both.
- Loops stay under 80 words, one bounded action, one stop rule, one
  approval boundary.
- New harness pieces belong to the map: update this file, `AGENTS.md` and
  `README.md` when you add one.
