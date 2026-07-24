# Application Logging Audit

Use this runbook to inspect Blockout logging without changing application code, configuration, or runtime state.

## Authority

Read:

- `.agents/skills/blockout-best-practices/references/logging-policy.md`
- the applicable Java, Python, or mobile policy
- current source and tests in the inspected Workset

## Safety

- Keep repository and external systems read-only during evidence collection.
- Do not start services, call production, rotate credentials, change levels, or execute remediation.
- Never copy secrets, tokens, personal data, provider payloads, or production logs into a finding.
- Treat Maaatch as a procedure reference, never as Blockout logging behavior.

## Procedure

1. Confirm the current default branch is clean and inspect open issues and pull requests for overlapping logging work.
2. Inventory handwritten log statements, logger configuration, exception logging, request correlation, and process
   boundaries in Java, Python, and mobile.
3. Sample high-value flows: startup/shutdown, scheduled scrape runs, dependency calls, writes, messaging, authentication,
   retries, and terminal failures.
4. Check for:
   - secrets, tokens, personal data, full request/provider bodies, SQL, or stack traces at unsafe levels;
   - duplicate logging of one exception across adapter, application, and process boundaries;
   - swallowed errors, success logs before durable outcomes, or misleading severity;
   - dynamic values embedded in message templates rather than structured fields;
   - committed `console.log`, `print`, or ad hoc debugging;
   - missing correlation or owned lifecycle evidence where diagnosis would otherwise be impossible.
5. Re-read each candidate in its full call path. Discard style preferences and findings unsupported by observable risk.
6. Classify remaining findings as security/privacy, correctness, operability, maintainability, or no-op.
7. Deduplicate against active issues and pull requests by exact file boundary and root cause.

## Finding Publication

Publishing findings is a separate mutation phase. Create the smallest coherent issue only when evidence is current,
actionable, non-duplicated, and identifies an owner, frozen Workset, acceptance checks, and severity. Do not assign,
claim, or execute it from this audit.

## Result

Report inspected areas, evidence commands, actionable issue links, deduplicated candidates, and a clear no-op when no
finding survives revalidation.
