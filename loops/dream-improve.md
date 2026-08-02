## dream-improve

Continuously ships the highest-value backlog item as one verified slice per
run; stops at release time or when the backlog is empty.

Prompt:

> Read ROADMAP.md and RESEARCH.md, then pick the single highest
> impact-to-effort backlog item and implement it as one slice, following
> AGENTS.md: tests alongside, smallest diff, i18n both locales. Verify
> `npm run check:full` is green, then commit with a short imperative message
> and push to main. Stop after one slice, when the backlog is empty, or when
> a release is due. Ask before anything public-facing beyond the push —
> releases, tags, issues, posts.
