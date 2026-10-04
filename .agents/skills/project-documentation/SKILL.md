---
name: project-documentation
description: "Create, maintain or consolidate shared technical documentation under docs with consistent paths and document structures. Use for project architecture/stack references and documentation organization, not to replace feature specification or planning workflows."
---

# Project documentation

Keep a small, predictable reference for technical information shared across a project. This is a personal documentation convention, not a framework requirement. Apply it to the authorized scope; installing the skill does not authorize reorganizing a repository.

## Find the owning sources

Read repository instructions and identify current decisions, proposals, implemented configuration and historical evidence. Resolve the authority of each source from the project, not its filename or age. A completed document or successful prototype is not approval or runtime qualification.

Give each maintained decision one authoritative home. A short overview may link to that home; do not repeat detailed rules, schemas, interfaces or rationale just to make a document self-contained. Preserve an existing owner outside `docs` when appropriate. A conflict is a decision to resolve, not permission to pick the most recent-looking text.

Respect specialized documentation systems. They own their artifact layout, writing, revision and validation procedures. When Spec Kit is present, use its applicable official workflow for any change to its artifacts; do not prescribe paths or contents inside `specs`, rewrite its skills/templates, or freeze a local copy of its rules here. Route an identified requirement or planning change to that workflow. This skill neither requires Spec Kit nor creates specifications or plans when they are absent.

Keep product behavior with its functional owner and feature implementation details with their technical owner. Keep agent instructions in the project's existing guidance, executable truth in manifests/configuration, and code contracts beside code or in their authoritative schema. Do not move a design library or prototype into `docs`; link the actual authority when needed.

## Use the common documentation shape

Use these names for the corresponding needs. Create only documents with concrete maintained content; the table is not a scaffold to generate.

| Path                                 | Purpose and creation condition                                                                                                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/architecture.md`               | Shared technical baseline when architecture or stack choices exist: scope/status, stack, runtime responsibilities and communications, common technical constraints, and decision sources. |
| `docs/development.md`                | Human setup and local verification instructions when they need more than the existing repository entry point. Link executable commands and sources rather than duplicating scripts.       |
| `docs/operations/<procedure>.md`     | An actual operating procedure with prerequisites, actions and observable outcomes; not a speculative recovery programme.                                                                  |
| `docs/integrations/<integration>.md` | Shared provider/platform setup or constraints not already owned by a feature plan, contract or configuration. An integration alone does not justify a document.                           |
| `docs/design.md`                     | Navigation to existing prototype/design authorities and their applicable review evidence when a shared reference is needed. No copied screens or parallel approval log.                   |
| `docs/README.md`                     | A short navigation index only when the repository entry point no longer provides sufficient orientation. Link purposes, not copied decisions.                                             |

Keep architecture and stack together rather than maintaining a separate stack catalogue. Use lowercase kebab-case for variable filenames, verb-object names for procedures and the established integration name for provider documents. This catalogue is closed: a new category requires an approved evolution of this skill bank before project adoption. If no category fits a concrete need, identify that need and retain necessary source information with its current owner while the bank decision is pending. Do not invent a local exception, miscellaneous notes area or nesting by author, date or issue number.

Read [document shapes](references/document-shapes.md) when creating a document or consolidating its structure. Use the [architecture template](assets/architecture.md) for a new shared baseline. Retain applicable headings, remove authoring comments and fill only supported facts. Existing documents need structural normalization only within an authorized reorganization, not on every small edit.

## Distinguish a decision from installed state

Record whether a choice is proposed or accepted. Identify deployed/implemented facts separately, with their evidence. In a planning-only project, an accepted stack is still not an installed or qualified stack. Do not select technologies or manufacture versions to fill the template.

Link manifests, lockfiles and configuration for installed versions and executable commands. Record a version constraint only when it is itself a project decision, linking its owner; do not maintain a second inventory of every locked dependency. Report disagreement between an accepted target and implementation without silently changing either.

Keep common architecture concise enough to coordinate feature work. Detailed feature models, API semantics and implementation tasks stay with their owners. Link the approved rationale where it exists rather than copying alternatives and decision history. Transient experiments and progress belong in the conversation or existing tracker unless a specific durable evidence need justifies a maintained document.

## Consolidate without losing meaning

For an authorized cleanup, inspect both a document's unique content and its incoming references before deciding to keep, merge, move or remove it. Identify the destination owner for retained information; obsolete proposals need not become new requirements. Preserve evidence still needed for continuity, decisions or qualification, with a stable reference where the project permits it. Do not assume Git history alone is sufficient or create a permanent archive by default.

Separate relocation from changes to meaning. Existing authorization can cover both, but a documentation cleanup alone does not approve new behavior, architecture or acceptance. Where a transfer belongs to a specialized workflow, complete that workflow before removing the source; if unavailable, report the remaining transfer instead of inventing its output.

Work in coherent groups: update the owner, adjust consumers, verify retained information, then remove superseded copies. Update links, indexes, agent routing and documentation checks affected by the new tree. Do not leave a corrective note next to contradictory instructions. Respect ongoing edits and protected upstream imports.

Check effects on existing prototypes, design references and implementation. An unaffected realization needs no update; a missing realization is not a new deliverable. Reorganization alone does not authorize changing those resources. Identify any dependent change that remains outside the approved scope.

## Verify the final reference

Check local links and anchors, naming, source ownership and consistency against the intended final tree. Run the repository's actual documentation checks and inspect the final diff. Walk through a representative consumer: can it find the current shared decision, distinguish it from a proposal or historical fact, and reach its owning detail without competing instructions?

Report what was reorganized, what remained with its owner, and any unresolved conflicts or inaccessible sources. Distinguish document validation from runtime, native, provider and visual qualification. Do not claim a cleanup is complete while necessary transfers or reference repairs remain undone.
