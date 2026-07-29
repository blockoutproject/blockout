# Blockout Git Profile

This overlay supplies repository-specific Git and GitHub values to the portable Git workflow.

- Integration branch: `develop`
- Task pull-request base: `develop`
- Repository posture: private organization repository on GitHub Free
- Integration method: merge commit only
- Disabled methods: squash, rebase merge, auto-merge, automatic head deletion, and web-based branch updates
- Task branch prefixes: `feature/`, `bugfix/`, `tech/`, and `hotfix/`
- Issue and pull-request title: `[<indicator>] - <brief action phrase>`
- Task commit: `[TASK-ID] <brief action phrase>`
- Non-task commit: `<kind>: <brief action phrase>`
- Allowed non-task kinds: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, and `ci`
- Exact merge command:
  `gh pr merge --merge --delete-branch --match-head-commit <full-head-sha>`
- Exact label and area catalog: [`github-taxonomy.md`](github-taxonomy.md)

## GitHub Settings

| Posture     | Repository capability or setting     | Blockout decision                                                                                                                                            |
| ----------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Required    | Standard repository roles            | Grant `Write` only to contributors who need task-branch publication, `Maintain` only to workflow operators, and `Admin` only to access and recovery owners.  |
| Required    | Default branch and merge methods     | Use `develop` and allow merge commits only. Keep squash, rebase, auto-merge, automatic head deletion, and web branch updates disabled.                       |
| Optional    | Web commit signoff and private forks | Enable only for a separately accepted signoff or contributor-access need; neither replaces claim, review, validation, or release gates.                      |
| Unavailable | Protected branches and rulesets      | Do not claim that direct pushes, force pushes, deletion, pull requests, reviews, or checks are enforced by GitHub for this private GitHub Free repository.   |
| Unavailable | Required reviewers and CODEOWNERS    | Reviews remain useful evidence but are not platform-enforced.                                                                                                |
| Unavailable | Auto-merge and merge queue           | Use the explicit Merge train and exact head-bound command instead.                                                                                           |
| Deferred    | Paid enforcement features            | Reconsider branch protection, rulesets, required reviews or checks, code ownership, and merge queue only after a plan upgrade or demonstrated workflow need. |

`Write` permission includes direct push and merge authority. Compensating controls are therefore mandatory:

1. Roadmap claims and Worksets own task assignment and write conflicts.
2. Each contributor uses one claimed issue branch and publishes a draft pull request with exact-head validation
   evidence.
3. Review follows the independent-review or documented solo fallback in the portable workflow.
4. Integration uses the explicit Merge train. Nobody pushes or merges directly to `develop`, enables auto-merge, or
   substitutes another merge method.
5. An accidental direct push, merge, force push, branch deletion, or setting change stops publication and is recovered
   through a reviewed issue and pull request. Never rewrite `develop`; revert harmful integrated changes with a new
   merge commit.

## Work Types And Names

| Work                                                      | Native type  | Branch                | Indicator   |
| --------------------------------------------------------- | ------------ | --------------------- | ----------- |
| Accepted roadmap implementation                           | Feature/Tech | `feature/` or `tech/` | task ID     |
| Product feature outside an existing roadmap identifier    | Feature      | `feature/`            | `[Feature]` |
| Defect or regression                                      | Bug          | `bugfix/`             | `[Bug]`     |
| Documentation only                                        | Tech         | `tech/`               | `[Docs]`    |
| Tooling, workflow, contracts, CI, maintenance, tech debt  | Tech         | `tech/`               | `[Tech]`    |
| Research, configuration, or decision without runtime code | Action       | `tech/`               | `[Action]`  |
| Large grouped objective                                   | Epic         | `feature/` or `tech/` | `[Epic]`    |
| Urgent environment or production correction               | Bug/closest  | `hotfix/`             | `[Hotfix]`  |

The Merge train candidate set contains every structurally valid non-draft pull request targeting `develop` at startup.
The sole automatic check exception is a terminal GitHub check with no executed step and one annotation proving a
billing restriction; record the unchanged head SHA, check-run ID, and annotation.

After merge, fetch `origin/develop` and fast-forward local `develop` with
`git merge --ff-only origin/develop`. Final Merge train reports use the user's chat language for the branch-refresh
reminder.
