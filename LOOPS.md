# Loops

Bounded, repeatable agent loops for Dream, written in the
[loopy](https://signals.forwardfuture.com/loop-library/catalog.md) format:
each loop is a `## name` heading, a one-sentence explanation, and a
`Prompt:` blockquote under 80 words carrying only the trigger, the bounded
action, the feedback check, the stop rule and the approval boundary.

A loop is a feedback system with terminal states, not permission for endless
autonomy. Every loop here follows the observe → choose → act → verify →
record → stop cycle:

1. **Observe** — read fresh state (the backlog, the CI runs) before acting.
2. **Choose** — pick ONE action by explicit criteria (highest
   impact-to-effort; the actual red job).
3. **Act** — make one bounded, reversible change (one slice, one fix).
4. **Verify** — the same gates every time (`npm run check:full`;
   `gh run view` green).
5. **Record** — the commit and the report are the record.
6. **Stop** — at a named terminal state: done, empty backlog, release time,
   green pipeline, or blocked.

## The loops

- [dream-improve](loops/dream-improve.md) — the build loop. **Use when**
  there's roadmap/research backlog and you want steady, verified progress:
  one slice per run, committed and pushed, stopping at release time or an
  empty backlog. Approval boundary: anything public-facing beyond the push
  (releases, tags, issues, posts) is asked first.
- [dream-release-watch](loops/dream-release-watch.md) — the repair loop.
  **Use when** CI or the Pages deploy might be red (after a push, on a
  schedule, before a release). Green is a clean no-op stop; red gets a
  minimal diagnosed fix; missing credentials are reported, never worked
  around.

## Running a loop

Hand the loop's Prompt to a capable agent (an orchestrator session, Claude
Code, Codex, Kimi) as its standing instruction. The prompt is self-contained
— the agent reads `AGENTS.md` for conventions, uses the subagents in
`.claude/agents/` for specialization, and proves each cycle with the gates.
Running a loop authorizes only what the prompt says: commits and pushes to
`main` in dream-improve's case, and nothing scheduled, destructive or
external anywhere. See `docs/HARNESS.md` for how loops fit the rest of the
harness.
