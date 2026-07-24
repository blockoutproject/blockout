# Application Logging Execution

Use this runbook only for an approved and claimed logging finding. It does not authorize a repository-wide cleanup.

## Preconditions

- Acquire the issue through `docs/runbooks/tasks/acquisition.md`.
- Read the frozen Workset, acceptance criteria,
  `.agents/skills/blockout-best-practices/references/logging-policy.md`, and the owning runtime policy.
- Revalidate the finding against current source. Close or return a real no-op when the evidence is obsolete.
- Preserve runtime behavior unless the issue explicitly authorizes a correction.

## Procedure

1. Reproduce or statically confirm the unsafe, missing, duplicate, or misleading logging behavior.
2. Identify the single owning boundary: adapter, application operation, consumer, scheduler, or process lifecycle.
3. Apply the smallest correction:
   - remove or redact sensitive fields;
   - log an exception once at the boundary that owns recovery;
   - use a stable message and structured low-cardinality fields;
   - move success evidence after the accepted durable outcome;
   - remove committed debug output;
   - add correlation only where an established context can propagate it.
4. Do not add a logging wrapper, aspect, annotation framework, global interceptor, or generic context system unless the
   issue proves several active consumers need it.
5. Update focused tests only when behavior or a stable logging adapter contract can be asserted without freezing text
   formatting or framework internals.

## Validation And Delivery

- Run formatting and the owning lint, typecheck, or test target.
- Run the backend reactor for shared Java logging configuration and both scraper checks for shared Python configuration.
- Confirm no secret or personal data appears in committed fixtures or snapshots.
- Finish with `npm run format:check` and `git diff --check`.
- Publish through `docs/runbooks/tasks/execution.md`, reporting any intentionally skipped runtime evidence.
