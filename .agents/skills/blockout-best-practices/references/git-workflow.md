# Git Workflow

## Branches

- `main` is the stable baseline.
- `develop` is the integration target once the repository governance is configured.
- Use one focused branch per issue: `feature/<issue>-<slug>`, `bug/<issue>-<slug>`, or `tech/<issue>-<slug>`.

## Publication

1. Start from a clean, current integration branch.
2. Preserve unrelated changes and stage explicit paths.
3. Run scope-appropriate validation, `git diff --check`, and `git diff --cached --check`.
4. Use an English imperative commit message.
5. Push the focused branch and open one draft pull request.
6. Never merge without explicit current-user authorization and current CI evidence.

Production deployment authorization is separate from Git publication authorization. A merged monorepo change must not
silently alter Dokploy or retire a standalone production repository.
