# Completed Tasks Audit

Use this runbook to detect Roadmap tasks marked complete without durable delivery evidence. This is a read-only
reconciliation audit until the explicit publication phase.

## Authority

Read the Roadmap operations, lifecycle, governance, taxonomy, and Git workflow references from the Blockout
best-practices skill. Use the live organization Roadmap, issues, pull requests, default branches, and current repository
as authority.

## Procedure

1. Read the complete Project index with the validated compact helper.
2. Select recently completed issues and their closing pull requests. Do not infer completion from Markdown checkboxes.
3. Verify:
   - issue state is closed and Roadmap status is `Done`;
   - the linked pull request is merged into the expected base branch;
   - the merge commit is reachable from the current remote base;
   - required checks completed successfully;
   - the frozen Workset and acceptance criteria match the delivered diff;
   - assignees and claims were released;
   - dependent issues and parent Epics were reconciled.
4. Separate eventual-consistency delay from a durable mismatch by taking two stable snapshots.
5. Deduplicate each mismatch against active repair issues and pull requests.

## Publication

Do not reopen, edit, assign, move, or repair a task during evidence collection. In a separate authorized phase, publish
one focused reconciliation issue per coherent root cause with exact issue/PR/commit evidence and a frozen Workset.

## Result

Report inspected completions, confirmed healthy tasks, published finding links, deduplicated mismatches, and unresolved
permission or API limits. A fully consistent Roadmap is a valid no-op.
