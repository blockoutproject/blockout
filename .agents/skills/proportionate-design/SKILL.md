---
name: proportionate-design
description: "Enforce minimal product behavior and implementation during requirement clarification, planning, task decomposition, coding and review. Remove unnecessary scope and mechanisms; use standard public library/platform behavior directly."
---

# Proportionate design

Deliver the smallest coherent solution to the requested need. Apply this rule to every change, including a single state, branch, wrapper or safeguard. Reduce first. Do not add behavior merely because it is technically possible, more defensive or easier for an agent to generate.

## Minimize the behavior before the code

Separate the useful user outcome from the proposed interaction, mechanism and hypothetical failure cases. Implement only the requested behavior and indispensable authorization, privacy, transaction and data-integrity guarantees. Do not promote imagined failures, exhaustive coverage or extra precision into product requirements.

Start with the ordinary behavior of the selected library or platform. An ordinary failure, retained mounted input and a later explicit action are sufficient unless an accepted requirement establishes a concrete need for stronger handling. Do not invent recovery modes, verification protocols, automatic repair, hidden retries or special treatment for secondary cases. A possible failure, or an observed secondary inconvenience, does not by itself justify a dedicated mechanism. Leave nonblocking limitations within the standard behavior instead of solving every conceivable case during development.

Challenge expensive requirements before implementing them. Existing specifications, architecture, merged code and passing tests do not prove that their complexity is necessary. Name the exact user-visible consequence and recommend the simplest acceptable behavior. Obtain the required owner decision before changing accepted behavior or binding architecture/conventions, unless that change is already authorized; do not silently weaken a real guarantee or preserve an unnecessary mechanism solely because it already exists. Reconcile the existing owner artifacts in place under the project's procedure.

## Use the standard mechanism directly

Use documented public APIs, ordinary configuration and existing owners. Read the selected library's actual contract before adding code around it. Keep its state, lifecycle, observation, cancellation, retry and persistence responsibilities there. Keep domain intent with its current owner. Share an established pattern without forcing unrelated lifecycles into one framework.

Do not mirror library state, synchronize duplicate owners, access private internals, emulate a stronger contract or build fallback infrastructure around normal limitations. Do not add speculative guards, compatibility modes for hypothetical consumers, generic recovery controllers, schedulers, registries, extension points or configurable engines. Calling a wrapper small, focused or reusable does not justify it.

At the first need for a mirror, synchronization layer, workaround or additional controller, stop adding machinery. Check configuration, native options, component ownership and the requirement itself. Correct the local cause directly. Do not compound one workaround with another.

Necessary custom code must implement a concrete required domain responsibility that the public mechanism does not supply. Establish that gap at the affected boundary and choose the smallest direct local adaptation. If meeting the requirement needs a new subsystem or a stronger library guarantee, present the simpler behavior and the exact unresolved requirement for the owner's decision before building it. Never use this exception to strengthen a requirement the user did not request.

## Reduce within the authorized boundary

Before adding a path, identify the states, reads, branches, wrappers, dependencies or interactions it replaces. Remove the superseded path and its now-unused consumers and assertions. Do not retain parallel implementations, dormant policies or speculative compatibility layers. Trace actual supported consumers, generated integrations and framework conventions before removal; a text search alone does not establish that code is unused.

Every change must serve the requested outcome or an actually affected consumer of the same cause. Inspection and occurrence lists do not authorize rewriting every listed file, creating a helper or test per occurrence, or improving neighboring features. Do not expand a local fix into an architecture, dependency, migration or qualification project. Preserve concurrent work and existing authorization boundaries.

At equivalent required behavior, choose the smallest amount of clear code and the fewest concepts needed to understand and maintain the result. Remove needless indirection. Do not use line-count quotas, code golf or incomplete behavior to manufacture a reduction.

## Bound discovery and verification

Read only the official documentation and current integration needed to resolve the decisive uncertainty. Stop searching when a standard supported solution satisfies the need. Do not launch a technology survey, opportunistic upgrade or alternatives catalogue. Use a focused experiment only for an unresolved consequential boundary.

Verify the changed behavior and meaningful regressions proportionately at their actual owners. Do not build a larger test framework to sustain an unnecessary implementation. Preserve the distinction between documented, observed and unverified behavior; mocks, generated schemas and prototypes do not certify native, provider or production behavior.

During the existing review, remove avoidable code, duplicated responsibility and scope expansion. Explain unavoidable complexity briefly in the normal plan or PR. Add no separate simplicity report, checklist, scoring system, approval stage or parallel roadmap. Follow the project's existing procedures and approval gates.
