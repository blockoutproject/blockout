---
name: proportionate-design
description: "Evaluate product behavior and technical choices during requirement clarification, planning, or implementation when custom mechanisms or tool limitations materially affect complexity. Propose simpler alternatives with explicit tradeoffs and scoped evidence."
---

# Proportionate design

Choose behavior and implementation that a human can understand, verify and maintain for the actual product need. Apply this reasoning to consequential decisions and concrete implementation friction; an ordinary local change needs no design audit or option catalogue.

## Understand the outcome and its constraints

Separate the user's desired outcome from the interaction or mechanism proposed to achieve it. Identify accepted behavior, indispensable invariants, technical conventions and assumptions. A precise specification can still encode an unnecessarily expensive choice; traceability and complete coverage do not establish its value or feasibility.

When a requirement drives substantial custom machinery, proactively consider a simpler behavior that preserves the useful outcome. Explain the user-visible limitation and the implementation burden it removes. Present that alternative while decisions are still open, rather than asking the user to anticipate technical consequences. Do not invent a reduced product scope merely to make the task easier.

Keep authorization, privacy, data integrity and required correctness intact. Manual recovery, delayed freshness or a narrower interaction can be appropriate only when they satisfy the actual use and failure consequences. An accepted automatic behavior may be essential; convenience alone does not justify removing it. Established architecture and skill conventions also have a cost, but remain binding until an applicable exception or change is authorized.

## Prefer supported mechanisms

Start with the existing library or platform's supported behavior and ordinary configuration. Distinguish configuration, a focused adapter with a concrete responsibility, and a custom subsystem. A small adapter can be simpler than changing the stack; adding a dependency can cost more than a direct implementation.

Compare the concepts and ongoing work an option introduces: duplicated state, synchronization, concurrent updates, persistence, recovery, operational intervention and meaningful tests. Do not use line count, hypothetical future reuse or the agent's ability to generate code as the justification. Avoid speculative extension points; describe a concrete condition for reconsidering the choice only when it helps a present decision.

For a material tradeoff, compare the direct solution with a credible simpler alternative. If both preserve accepted behavior, choose within the task's existing authority. If simplicity requires changing behavior, make that change a product decision, not an implementation shortcut. Explain why the added mechanism is necessary when no simpler option satisfies the need.

## Establish feasibility at the uncertain boundary

Once a technical direction emerges, consult official documentation and release notes for the relevant technologies, libraries or providers, checking the intended version, platform and project configuration. Compare relevant alternatives or available updates when they could materially simplify the solution, accounting for compatibility and adoption cost without implicitly changing an approved stack. Link the decisive sources and distinguish documented capabilities from inferred implementation difficulty. Use a focused experiment when consequential uncertainty remains. Stay within the authorized environment and side effects; feasibility work does not authorize production changes or application scaffolding.

Label what is documented, directly observed, inferred and still unverified. A mock, generated schema or successful launch proves only its own boundary. An unavailable native or integration environment remains a qualification limit; do not present a plausible workaround as proven support. Resolve decision-critical uncertainty before treating the affected choice as settled, while continuing independent work.

Identify fragile interactions during requirement and prototype exploration, before their behavior becomes an expensive design commitment. A prototype demonstrates an experience; it does not prove that the target runtime provides the same mechanism.

## Reconsider when implementation supplies new evidence

When implementation needs unexpected synchronization, unsupported APIs, repeated workarounds or another layer around a failing boundary, investigate the cause before adding machinery. Distinguish a local defect or configuration error from a limitation of the tool or a flawed design assumption. Correct an ordinary defect directly; difficulty alone is not grounds for redesign.

For structural friction, explain the evidence, affected requirement or decision, simplest viable resolution and user-visible consequences. Change implementation details autonomously when accepted behavior and binding constraints remain satisfied. Obtain agreement for a material change to accepted behavior, architecture or scope unless the existing authorization already covers that exact change. Do not ask again for an approved decision, silently weaken a contract or redesign unrelated work. Continue unaffected work while the dependent decision remains open.

## Keep decisions reviewable

Give the user a recommendation with its practical benefit, cost, limitation and evidence. A small decision may need one sentence; a consequential alternative may need a short comparison. Avoid mandatory scoring systems, fixed numbers of options, repeated approval gates or a separate simplicity report for every task.

Record accepted decisions in their owning specification, plan or existing tracker, using the project's applicable procedures. Keep those sources consistent and revalidate affected design when observable behavior changes. Do not duplicate official planning workflows, create a parallel roadmap or claim that a coherent plan has already been qualified in the runtime.
