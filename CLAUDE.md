# CLAUDE.md

**Read `AGENTS.md` first** — it is the source of truth for conventions,
architecture rules and commands. This file is only a bootstrap so the ten
most important things survive even if `AGENTS.md` is missed.

1. `npm run check` (typecheck + lint + tests + build) must be green before any
   hand-off. `npm run check:full` adds the Playwright e2e suite;
   `npm run check:mcp` installs, builds and tests the standalone
   `mcp-server/` package (its gate — root `check` never touches it).
2. `src/engine/` and `src/game/` are framework-free pure TypeScript: no DOM,
   no React, no imports from `store/`, `ui/`, `storage/` — and they stay
   unit-tested (engine coverage ≥80%).
3. Dependency direction: `ui/` → `store/` → `engine/`, never the other way.
   Import the engine via its public barrel `src/engine/index.ts`.
4. All document mutations go through `History` commands (invertible
   `apply`/`revert`, no snapshots). Exceptions (outside undo): workspace mode,
   animation settings, game casting/settings, active-frame switching.
5. `doc.layers` mirrors the ACTIVE frame — never write it directly; use the
   helpers in `src/engine/document.ts`.
6. No literal UI strings: everything renders through `t(key)` with entries in
   `src/ui/i18n/en.ts` AND `ar.ts` (tests assert key parity). RTL must keep
   working — layout uses CSS logical properties.
7. Styling consumes design tokens from `src/styles/app.css` only (no hardcoded
   colors); motion is transform/opacity-only and respects
   `prefers-reduced-motion`.
8. No new runtime dependencies without a clear need; keep diffs minimal and
   match surrounding style (`npm run format` before committing).
9. The service worker is hand-rolled (`public/sw.js`) — non-GET and
   cross-origin requests must never touch the cache.
10. Never commit, tag or push unless explicitly asked; the orchestrator or
    human commits.

## Harness (for agents working on this repo)

- Specialized subagents: `.claude/agents/` (dream-engine, dream-ui,
  dream-verify, dream-release).
- Project skills: `.agents/skills/` (implement-slice, verify-release,
  dogfood-mcp).
- The dream-mcp server is wired in `.mcp.json`; build it first with
  `npm run check:mcp` (entry point: `mcp-server/dist/mcp-server/src/index.js`).
- Agent evals: `evals/` (`npm run evals` smoke-tests the harness).
- Bounded loops: `LOOPS.md` + `loops/`.
- The full map: `docs/HARNESS.md`.
