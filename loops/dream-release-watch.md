## dream-release-watch

Watches the CI and Deploy pipelines for `main` and repairs them when red;
stops when green or when blocked on credentials it does not have.

Prompt:

> Check the latest CI and Deploy workflow runs for main
> (`gh run list` / `gh run view`). If green, stop — a clean no-op is a
> success. If red, diagnose the failure, apply the minimal fix following
> AGENTS.md, and verify locally: `npm run check`, plus `npm run test:e2e`
> when e2e failed. Commit and push the fix. Stop when the pipeline is green
> or when blocked on credentials or permissions you don't have — report the
> blocker; never work around it or force-push.
