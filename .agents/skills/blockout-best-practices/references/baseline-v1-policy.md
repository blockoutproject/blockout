# Product Baseline And Source Gate

Read this before changing product behavior, activating a deferred capability, interpreting an ambiguous requirement, or
using historical code as implementation authority.

## Purpose

The repository may evolve from imported applications into a documented target system while containing historical
behavior, dormant code, future architecture, and generated boundaries at different levels of activation. This policy
prevents accidental product expansion while allowing explicit roadmap work to move the system forward.

## Source Authority

Use the following order when sources disagree:

1. The current user's explicit instruction and the active claimed issue.
2. Current product and runtime sources selected by the repository router.
3. Accepted architecture and durable decisions selected by the repository router.
4. Active OpenAPI sources and other owner-controlled contracts.
5. Characterized behavior of the running imported applications.
6. Historical documentation and dormant code, as context only.

The repository router must name the current product/runtime posture, accepted architecture, design authorities,
delivered baseline, and active owner-controlled contracts. Another repository may be a read-only structural reference,
but it never supplies product behavior or business code.

## Source Gate

Classify every proposed behavior change before implementation:

- `OK`: the active task and current sources agree on ownership, behavior, and acceptance evidence.
- `REVALIDATE`: the intent is current but one boundary, source, or consumer is ambiguous. Inspect the owning sources and
  resolve the ambiguity before editing runtime code.
- `BLOCK`: the change is justified only by historical code, deferred prose, a speculative architecture, or an adjacent
  opportunity. Stop and request a product or architecture decision.

Record only the evidence needed for the current task. Do not create a parallel requirements ledger.

## Baseline Discipline

- Preserve current runtime behavior unless the active issue explicitly authorizes a correction.
- Implement only the smallest complete vertical slice accepted by the task.
- Do not activate authentication, search, notifications, reporting, billing, new providers, new mobile flows, or new
  resource fields because a dormant skeleton exists.
- Do not infer a public contract from an entity, provider payload, UI mock, message, or historical DTO.
- Keep owner-controlled resources complete across mirrors; keep projections purpose-specific and explicitly named.
- Treat active generated transport boundaries as authorities. Change their sources first and regenerate through the
  owning task.
- Keep future architecture useful as direction, not as permission to create unused packages, abstractions, or runtime
  paths.

## Completion Gate

Before completing a behavior-changing task, confirm:

- the active issue authorized the behavior;
- the owning current source and contract agree;
- all changed producers and consumers were validated proportionally;
- no historical or deferred artifact was silently promoted to authority;
- generated output and local artifacts remain outside Git;
- the final report identifies any unresolved source decision.
