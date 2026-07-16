# Pull Request Merge

Merge at most one pull request per run.

1. Require explicit current-user merge authorization.
2. Reread the current diff, target, linked issue, reviews, and checks.
3. Require focused scope and current validation evidence.
4. Classify infrastructure failures separately; do not treat them as passing checks without an explicit waiver.
5. Merge only the authorized PR.
6. Reread the merged PR and issue, then reconcile dependent Roadmap state.

Merge does not authorize a production cutover.
