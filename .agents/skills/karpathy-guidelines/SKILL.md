---
name: karpathy-guidelines
description: Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, define verifiable success criteria, diagnose a bug's root cause, or apply DRY/SOLID design boundaries.
license: MIT
---

# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes: unchecked assumptions, unmanaged confusion, sycophancy,
bloated abstractions, and side-effect edits to code the task didn't ask about. Sections 6-7 add the long-standing
object-oriented design boundaries (DRY, SOLID) that keep the same discipline when structuring code.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. KISS: Simplicity First

**Keep It Simple, Stupid: prefer the solution that is simplest for a human to understand, implement, verify, and
maintain.**

- Simple means the fewest justified concepts and moving parts a human needs to understand, implement, verify, and
  maintain the solution — not the least effort and not an incomplete solution.
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- Reject speculative abstraction, cleverness, unnecessary algorithmic machinery, indirection, and adjacent cleanup
  when a direct solution satisfies the same requirements.
- KISS never permits incomplete behavior, brittle shortcuts, skipped constraints, or weakened validation, and it never
  removes complexity that a genuinely complex problem actually requires.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For an algorithm or performance change, implement the obviously-correct naive version first, verify it, then optimize
while preserving that verified behavior — don't optimize and correct at the same time.

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Root-Cause Bug Diagnosis And Resolution

**Characterize the symptom before choosing a fix. Don't patch what you haven't diagnosed.**

For every reported or detected bug, first determine whether the observed behavior is:

- an isolated local defect;
- a symptom of a deeper problem in architecture, domain rules, contracts, data flow, ownership, workflow, or an
  earlier decision; or
- one occurrence of a broader defect that can affect other paths or components.

Assess the blast radius by checking comparable code paths for the same defect pattern. Challenge a surface patch that
would preserve or hide the root cause; do not apply it. Do not invent a broad redesign or split a simple bug into
several tasks without evidence.

Choose the resolution scope from that evidence:

- One focused bug task when the cause is isolated and the direct correction is complete, safe, and independently
  verifiable.
- One coherent rework task when the root correction is larger but still forms one bounded, reviewable, verifiable
  deliverable.
- Linked and ordered tasks when the correction needs independent decisions, migrations, cross-area changes, staged
  delivery, or separately verifiable outcomes. Record dependencies and keep traceability from the detected bug to
  every resulting task.

## 6. DRY: Don't Repeat Yourself

**Give every piece of knowledge or behavior one canonical place in the system.**

- Extract duplicated logic into one reusable function, class, or module instead of copying it.
- A change to one rule or piece of domain knowledge should require editing exactly one place, not hunting for copies.
- DRY targets duplicated knowledge, not merely similar-looking code: don't force a shared abstraction onto two things
  that look alike today but change for unrelated reasons.
- A small justified duplication is better than the wrong shared abstraction; KISS still governs how that abstraction
  is shaped.

## 7. SOLID: Object-Oriented Design Boundaries

**Five boundaries that keep components focused, replaceable, and loosely coupled.**

- **Single Responsibility** — give each class or module exactly one reason to change; don't combine unrelated
  concerns (e.g., authentication and notifications) in the same unit.
- **Open/Closed** — extend behavior through new code (composition, polymorphism) rather than editing working code to
  bolt on a new case.
- **Liskov Substitution** — a subtype must be usable anywhere its supertype is expected without breaking the caller's
  expectations.
- **Interface Segregation** — prefer several small, client-specific interfaces over one broad interface that forces
  clients to depend on methods they don't use.
- **Dependency Inversion** — depend on abstractions, not concrete implementations; let high-level modules define the
  interface that low-level modules implement.

Apply SOLID where it reduces real coupling between components, not as decoration. Do not add an interface,
abstraction, or inheritance layer the current task doesn't need — that violates KISS and Surgical Changes
(sections 2 and 3).
