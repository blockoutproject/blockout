# Blockout Constitution

## Core Principles

### I. Specification-Led Product Intent

Accepted `specs/<feature>/spec.md` files MUST own observable product intent under
this constitution. Plans and tasks derive from that intent. Code, tests, prototype
experiments and historical proposals are evidence, not permission to change it.
Updating Spec Kit MUST NOT silently reopen accepted product decisions.

### II. Domain Integrity

Each shared functional concept MUST have an owning specification. Consumers MUST
reference its meaning, identities, lifecycle and invariants rather than redefine
them. Technical models and contracts MUST derive from those owners. A feature
directory does not prescribe a service, API or deployment boundary. Changes to
shared meaning MUST be reconciled with affected consumers before implementation.

### III. Approved Design And Scoped Planning Revisions

Before initial production technical planning for a new product or rebuild, the
complete agreed visual and interactive scope MUST have an explicitly approved
prototype, including its art direction. The UI Library MUST then formalize its
reusable foundations and components, and Product Design MUST reproduce the
approved experience using that library. The corresponding Figma design MUST be
explicitly approved before the first `speckit-plan` starts. Spec Kit's Constitution
Check verifies this prerequisite; installing a design skill or completing an issue
does not satisfy it.

Later material UI evolutions follow this sequence for the affected journeys,
except for revisions discovered during an authorized planning effort, which follow
the feedback loop below. Existing approvals remain valid for unchanged scope;
approval of a fragment never certifies a larger scope.

When planning reveals a necessary product change, its specification and design
reconciliation MUST remain within that effort, not be deferred solely as outside
planning. Functional decisions agreed with the owner during planning MUST first
be recorded in the owning specifications and reconciled with affected consumers.
Each specification and plan retains its ownership; discovering a change in a shared
plan does not transfer that ownership.

For a material visual or interaction change, update the designated prototype in
its own repository and obtain explicit owner approval of the affected experience
at a reviewable revision. Only after this approval, update the designated UI
Library and Product Design as needed, verify fidelity to the approved prototype
and record exact design references. Present the resulting Figma design for a
second explicit owner approval, including when it faithfully reproduces the
prototype. Successful fidelity checks MUST NOT substitute for this approval. Any
new product or design decision MUST return through this feedback loop. Autonomous
execution MUST respect both approval gates; unaffected planning MAY continue while
either approval is pending.

After this reconciliation and its required approvals, finalize the affected native
planning artifacts.
Specification corrections, plans and other artifacts authorized by the original
issue MUST be reviewed together in one delivery, without separate intermediate
document approvals. Generate tasks only when the issue authorizes them. Dependent
planning MUST NOT be declared complete with required prototype approval, Figma
approval or design reconciliation deferred.

Purely nonvisual evolutions and documentation/tooling maintenance require no
unrelated design work. Read-only feasibility research MAY inform exploration before
approval without selecting the production architecture. Design approval and Figma
fidelity establish the reviewed experience, not native, provider or
production-runtime qualification.

### IV. Contract-First Interfaces And Reproducible Generation

Shared interfaces MUST be agreed before dependent implementation, with one
authoritative source and explicit providers and consumers. Selected HTTP APIs
MUST use OpenAPI-driven server interfaces, transport DTOs and active clients.
Technical planning selects the stack, dialect, source locations and generators
together; this principle selects no framework or service topology.

Authored sources MUST precede reproducible generated projections. Generated code,
build outputs and caches MUST remain outside Git. Contract changes MUST be checked
against the selected generators and affected consumers; schema or document review
alone does not establish runtime compatibility.

### V. Proportionate Simplicity

Choose the simplest solution that satisfies accepted intent. Material decisions
MUST state their rationale, relevant alternatives and verification in the owning
native artifacts. Specialized recovery, automation and shared abstractions require
a concrete current need. If simpler behavior changes an accepted requirement, make
that product decision explicit before implementation; do not hide it in a plan.

Do not invent availability commitments, load/capacity programmes, performance
benchmarks, automatic recovery or speculative roadmap items. Preserve actual
domain timing, security, data integrity and continuity requirements. Verify the
changed behavior proportionately; ordinary manual operations are acceptable where
they meet the agreed need.

## Project Constraints

Blockout V2 is a complete backend, ingestion and mobile rebuild, including mobile
internals. Accepted V2 behavior, scoped design approvals and explicit V1 continuity
obligations remain binding. Historical code, technical models, contracts and stack
choices are discovery evidence, not defaults for the rebuild. Withdrawn technical
dossiers are not planning inputs without a new owner request. Provider names in
continuity requirements select no future stack beyond their accepted obligation.

Secrets, private diagnostics, personal data and provider payloads MUST remain
outside public artifacts. Installed skills, historical tooling and prototype code
MUST NOT select architecture or authorize production/provider operations.

## Spec Kit Integration

Use the installed official `speckit-*` procedures and the official documentation
for that version. Keep managed skills, templates and scripts intact; use official
installation/upgrade and documented customization mechanisms for an approved need.
Personal skills supply technical expertise, not a competing specification,
planning or task workflow. The design prerequisite above is the project's cycle
adaptation; no custom command, preset or extra planning dossier is required.

Use the documented Living Spec approach for existing features: preserve accepted
intent in the owning specification and keep its derived artifacts consistent.
Routine tool updates are not product amendments. Architecture and technical
rationale belong in the native plan/research artifacts, and implementation work
and completion state belong in `tasks.md` under the official procedures.

GitHub issues hold requests, operational ownership, real blockers and acceptance
records. They MUST reference the owning artifacts rather than duplicate their
requirements or the official procedures. Git delivery mechanics remain in agent
guidance and the delivery skill; Codex interaction mode is not a Spec Kit rule.

## Governance

This constitution governs specifications, plans, tasks and implementation reviews.
Agent guidance and personal skills MUST NOT contradict it. Amend through the
official `speckit-constitution` procedure with owner authorization, preserving the
ratification date. Use MAJOR for incompatible principle changes, MINOR for new or
materially expanded principles, and PATCH for clarifications. Apply the official
constitution checks and record any justified exception in the owning plan.

**Version**: 9.0.1 | **Ratified**: 2026-08-29 | **Last Amended**: 2026-10-12
