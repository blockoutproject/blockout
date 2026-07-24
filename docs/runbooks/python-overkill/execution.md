# Python Over-Engineering Execution

Use this runbook only for a claimed Python-complexity finding.

## Preconditions

- Revalidate all imports, scheduled entrypoints, provider paths, writes, retries, and tests.
- Characterize controlled provider input, normalized values, decisions, ordered writes, failure result, and lifecycle.
- Keep generated Blockout clients inside their adapter and preserve current dependencies and packaging.

## Procedure

1. Simplify one behavioral seam at a time.
2. Prefer direct typed functions, dataclasses, focused protocols, composition, and provider-local adapters.
3. Remove a protocol, wrapper, factory, manager, base class, cache, or generic helper only after its final justified
   consumer disappears.
4. Keep one production path. Differential execution belongs in tests or a no-write harness.
5. Do not combine the change with provider behavior correction, scheduling changes, dependency upgrades, uv adoption,
   an Nx Python plugin, Docker changes, generated-client work, or type-checker adoption.
6. Delete obsolete tests and update focused behavior tests without weakening parity.

## Validation And Delivery

- Run `npm run format`.
- Run the owning scraper syntax check, lint, format check, complete test suite, import/startup proof, and offline fixtures.
- Run exact generated request serialization and controlled local API smoke only when production behavior changes and the
  issue authorizes it.
- Never call production services or write to external providers.
- Finish with `npm run format:check` and `git diff --check`.
- Deliver through the task execution runbook with explicit parity and skipped-evidence reporting.
