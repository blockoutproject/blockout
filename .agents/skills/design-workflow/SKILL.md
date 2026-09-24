---
name: design-workflow
description: "Plan or review an SDD design workflow from specifications through an interactive prototype, Figma and production readiness, for a new application or an evolution. Includes dependent and parallel work decomposition; does not execute every stage merely because it is loaded."
---

# Specification-driven design workflow

Use one process at two scales: a new application or release may need shared foundations and many journeys; an evolution reuses those foundations and covers its changes and affected journeys. The unit of validation is the agreed specification scope, not necessarily one feature, screen or issue. Do not shrink that scope to an approved fragment just to pass a gate.

Keep the three sources complementary: accepted specifications own requirements, the approved interactive prototype demonstrates navigation and behavior, and approved Figma files own visual composition and reusable design components. Prototype code is exploratory, not production implementation authority.

## Establish scope from specifications

Read the project's accepted specifications and existing decisions. Identify the visual and interactive requirements, supported platforms, relevant states and affected journeys for the selected scope. Keep requirement-to-journey coverage in the existing issue or task structure; do not create a second roadmap or a project documentation file just to hold the workflow.

When exploration exposes a gap or contradiction, surface the decision and obtain explicit agreement before changing accepted behavior. Use the applicable official SDD/Spec Kit procedure available in the project to amend specifications; do not reproduce that procedure here or treat prototype experiments as approved specification changes.

## Decompose by dependencies and ownership

Start with the shared interactive skeleton: navigation, page structure, menus, contexts, entry points, destinations and return paths. Validate these foundations before distributing dependent screen work. For an existing application, reuse the accepted skeleton and validate any affected changes instead of rebuilding it.

Then identify independently workable lots. Split issues when it makes dependencies, ownership or validation clearer; do not impose one issue per screen or a fixed number of stages. Each parallel lot needs:

- its specification coverage, screens and states;
- its prerequisites and entry/exit behavior within the shared skeleton;
- an explicit file or directory boundary and the shared files it must not change independently;
- its owner when assigned, review criteria and integration checks.

Keep concrete issue lists, dependencies and assignments in the project tracker. Coordinate a shared routing, shell, mock-data contract or component change through its designated owner before dependent lots adopt it. Distinct issues alone do not prevent repository conflicts. Use isolated branches or worktrees when appropriate to the agreed collaboration setup, without imposing a PR ceremony on prototype iterations. Parallelize only lots whose dependencies and ownership allow it; this guidance is not authorization to recruit people or launch agents.

## Build and challenge the interactive sketch

Maintain a separate prototype project with mock data and local interactions. Reuse it for later iterations. Work screen by screen with short feedback loops: first make destinations, actions and returns understandable, then refine ergonomic placement, responsive layouts, states and meaningful effects. Early work may stay visually rough; do not make final art direction a prerequisite for testing navigation.

Review useful alternatives when there is a real decision. Validate each coherent stage with the user and integrate parallel contributions frequently to expose broken transitions, context loss or inconsistent shared elements. Rapid iterations and authorized pushes support exploration; production architecture and optimization are not prerequisites for the sketch. Follow the standalone prototyping skill when available for build and review mechanics.

Keep iteration screenshots and discussion in the conversation during exploration. Publish evidence in the owning issue only after explicit approval of the corresponding work, with its actual scope. An approved lot is not evidence that the entire prototype is complete. Keep issue content focused on current scope, decisions, dependencies and acceptance rather than a running history of experiments. Organizing issues does not authorize adding repository documentation or specification commits.

## Validate the complete selected prototype scope

After incremental reviews, verify the integrated prototype against every visual and interactive requirement in the selected scope, including relevant failure/recovery states, responsive behavior, accessibility and affected existing journeys. Resolve missing coverage and cross-lot inconsistencies before requesting explicit overall approval. Completion means the selected experience responds as specified, not merely that each screen renders.

For a new V1, this gate covers the agreed V1; for an evolution, it covers the evolution and its impacts. A step approval does not authorize canonical Figma translation or production implementation for that fragment. Read-only feasibility work can identify prerequisites without certifying unfinished design or starting production.

## Translate the approved experience into Figma

After whole-scope prototype approval, explore and approve the art direction if it remains open; otherwise reuse the existing identity. Derive the needed foundations, variables, styles, components and variants from the validated prototype, and create or amend the designated UI Library. Then compose the corresponding patterns, complete screens and required states in the separate designated Product Design file using live published library instances.

Preserve navigation, context, states and meaningful motion from the prototype while refining the final presentation. A static frame does not replace behavioral evidence. Follow the available Figma tool and governance skills for file operations and evidence. Resolve differences between specifications, prototype and Figma explicitly; a visual refinement must not silently change approved behavior. Revalidate affected work when a decision changes.

## Gate production and retain the prototype

Finalize the technical implementation plan and begin production only when the specifications, whole-scope prototype and corresponding Figma design are coherent and explicitly approved. Use the project's implementation, architecture and testing conventions to build production code; do not automatically transfer prototype code into the application.

Retain the prototype as an executable reference and a place to explore subsequent changes. Repeat the same process for later scope, reusing approved foundations and checking affected journeys. Stage approval, publishing authority and Git delivery permissions remain distinct; this skill does not grant merges, deployment, branch deletion or additional work beyond the user's request.
