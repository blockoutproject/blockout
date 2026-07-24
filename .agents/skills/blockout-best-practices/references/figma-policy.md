# Blockout Figma Interaction Policy

Read this policy before any Blockout mobile or product-design task that reads from, writes to, compares against, or
makes a decision in Figma. This includes visual discovery, token or component work, code-to-Figma calibration,
Figma-to-code implementation, and visual reconciliation.

## Authority

- The live [Roadmap Project](https://github.com/orgs/blockoutproject/projects/4) controls task existence, status,
  priority, execution mode, ownership, and claims; the selected issue controls scope, dependencies, Workset, and
  acceptance evidence.
- Runtime source and the running supported application surfaces control behavior, routes, authorization, data flow,
  copy, accessibility, platform integration, and available states. Figma cannot activate or redefine them.
- The durable
  [`Blockout Mobile Design System V1`](../../../../docs/architecture/blockout-mobile-design-system-v1.md) defines the
  relationship between canonical Figma assets, current runtime source, reusable components, and task-level evidence.
- The only canonical design file is
  [`Blockout - Product Design`](https://www.figma.com/design/NwDQmiXqSjKVzQ6gwry0zb) in the Blockout Figma team
  (`NwDQmiXqSjKVzQ6gwry0zb`). Do not create a parallel canonical file.
- The canonical Figma file controls visual composition. The application remains the authority for behavior and platform
  functionality.
- Owning issues, pull requests, Git history, and Figma version history retain detailed certification and delivery
  evidence. Do not recreate that task history in repository documentation.

## Entry Gate

1. Read the owning roadmap task, the mobile design-system model, relevant runtime sources, this policy, the mobile
   policy, and the applicable Figma skills.
2. Confirm that the task explicitly includes Figma or visual work and names the target foundation, component, flow, or
   screen family.
3. Classify the direction as visual discovery, code-to-Figma calibration, Figma-to-code implementation, or visual
   reconciliation.
4. Stop only when behavior, navigation, component ownership, token semantics, responsive intent, authentication, or a
   required provider state cannot be resolved from current evidence.

## Runtime Reconciliation Procedure

Use one continuous evidence session for a screen or component task. Do not repeatedly rediscover the same runtime,
source, and Figma facts between correction passes.

### 1. Establish the session

- Inspect the worktree, Docker containers, relevant ports, Java or Python processes, Metro, the installed development
  client, and the booted simulator before starting anything. After a machine restart, assume processes are stopped
  until inspection proves otherwise.
- For an isolated task, derive the smallest complete dependency set from the target state. For the sequential
  screen-by-screen reconciliation roadmap, start the complete Java application stack and search worker through their
  Nx targets, then Metro and the iOS development client. `pools-service` keeps its owned port `8081`; run Metro with
  Expo's official `--port 8100` option. Verify health before attempting authentication or navigation.
- Record which processes the task started. Keep the healthy session alive through source inspection, Figma mutation,
  focused corrections, and final visual QA. Do not tear it down after the first capture or restart healthy services for
  each Figma adjustment.
- Preserve processes that were already running for the user. Across consecutive Figma screen tasks, also retain the
  healthy task-owned application stack, Metro session, and simulator instead of stopping and reconstructing them after
  every task. Stop them only on user request, at the end of the reconciliation series, or to replace a failed process.

### 2. Capture runtime and source truth

- Navigate the iOS simulator to the exact route, state, theme, and authentication mode before changing Figma. Use the
  normal provider flow and an existing least-privilege test identity; never add a bypass or record account details.
- If the Google Mobile Ads consent prompt appears, the agent may select its visible **Accept** action and continue.
  Never encode or fake that provider state in application source, configuration, or committed evidence.
- Record the simulator model, its actual logical viewport, and the canonical Figma viewport. When the simulator cannot
  render the canonical dimensions exactly, normalize a transient capture proportionally for measurement and document
  both dimensions. Never compare mismatched frames silently.
- Capture one complete screen and focused references for dense or reusable controls. Keep captures transient and
  outside Git.
- Read the exact screen source, every shared component it renders, theme tokens, icon-library entries, and reachable
  variants. Build a short source-to-Figma inventory before writing: component owner, sizes, treatments, states,
  optional slots, dimensions, spacing, typography, colors, borders, gradients, shadows, and interaction-only behavior.
- Distinguish runtime defects from delivered intent. Do not normalize a visible discrepancy until source, simulator,
  and existing design-system evidence justify the correction.

### 3. Inspect the existing Figma model

- Inspect the exact screen frame and validation label, then trace every repeated element to its main component,
  component set, variant, properties, variables, styles, and icon master.
- Compare a reusable component's complete source API, not only the one variant visible on the target screen. Check all
  source-backed sizes, treatments, states, left and right slots, indicators, disabled behavior, and interactive state
  before declaring the Figma family complete.
- Verify exact icon paths against the pinned Expo icon library. Import or reuse editable vectors through instance-swap
  properties; never approximate an icon with primitives or a screen-local overlay.
- Attempt the exact product font once. If Figma still reports `hasMissingFont`, retains stale text metrics, or produces
  no render bounds, use the approved portable Inter weight equivalent in reusable Figma masters. Reapply the text,
  verify reflow and `hasMissingFont=false`, and record that native source remains the system-font authority.

### 4. Correct in ownership order

1. Correct a missing or incorrect semantic variable or style.
2. Correct the owning component master and its bounded variant or property API.
3. Replace or update linked instances in the target composition.
4. Apply a screen-local value only when the responsibility is genuinely unique to that screen.

- Keep variant axes source-backed and understandable. Use sibling families when two treatments have materially
  different structure; otherwise use one bounded axis. Avoid variant matrices above 30 combinations and arbitrary
  runtime style overrides as Figma properties.
- Keep the component master and its guidance in the existing category hierarchy. Do not create a second owner, detach
  an instance, or patch a shared defect with an absolute-positioned overlay.
- After every master correction, identify and regression-review affected canonical consumers before continuing.

### 5. Run two QA passes before validation

**Structural pass**

- Verify root dimensions, safe areas, bounds, auto-layout, component properties, variable and style bindings, font
  status, icon lineage, instance lineage, overflow, and validation metadata.
- Confirm that no detached duplicate, invented decoration, placeholder, hidden obsolete layer, or screen-local repair
  remains.

**Visual pass**

- Compare the complete simulator screen and Figma frame, then inspect each reusable or interactive region at close
  zoom. Check text baselines and wrapping, icon box and optical alignment, horizontal and vertical centering, padding,
  gap, border width, radius, gradient direction and stops, opacity, shadow, and adjacent spacing.
- Measure geometry instead of relying only on visual impression. Re-render the component master and the complete screen
  after the final correction.
- Regression-check only consumers affected by changed shared ownership. Do not reopen unrelated screens.
- Keep a frame `Validation pending` until both passes succeed against current simulator evidence. A structural audit or
  a visually plausible screenshot alone is insufficient.

### 6. Close once

- Record the final node IDs, source files, runtime state, dimensions, checks, intentional normalization, and remaining
  external limitations in the owning evidence.
- After final Figma and simulator QA, keep the healthy complete native session alive when the next authorized screen
  task will reuse it. Otherwise stop only task-owned Metro and application processes and report what remains running.
  Do not stop user-owned infrastructure implicitly.
- Publish the roadmap task only after the final full-frame render, focused component renders, repository checks, and
  worktree review all pass.

## Direction Of Work

### Visual discovery and code-to-Figma calibration

- Treat the shipped mobile application and runtime source as the authority for delivered behavior and reachable states.
- Produce a clean normalized design-system composition. Do not reproduce incidental alignment drift, duplicated styles,
  unsupported-surface defects, or one-off values as new design rules.
- Preserve the current dark identity, mobile information hierarchy, copy, and native platform boundaries.

### Figma-to-code implementation

- Inspect the exact approved node and current runtime source before editing code.
- Treat Figma as visual input within the owning roadmap task, not as authority for contracts, permissions, data,
  navigation, hidden states, or provider behavior.
- Preserve accessible native behavior when a static composition cannot represent it.
- Once a roadmap task explicitly certifies the complete Figma system as its sole visual authority, consume those
  variables, styles, component APIs, and canonical frames without recalibrating their geometry from the pre-adoption
  runtime. Runtime checks still protect behavior, accessibility, navigation, providers, and platform integration.

## File And Lifecycle Structure

- Keep one canonical design file named `Blockout - Product Design`.
- Use deterministic lifecycle pages: `00 - Cover`, `10 - Foundations`, a separator, the compact component group
  `20 - Actions & Inputs`, `21 - Content & Data`, `22 - Feedback & Overlays`, and `23 - Navigation`, a second
  separator, `30 - Ready for Development`, and `40 - Shipped`.
- Name screen frames `Domain / Screen / Viewport / State`.
- Keep every component master and its guidance together on its owning category page. Do not recreate the old
  single-canvas component page or split a small family into speculative pages.
- Place approved screen compositions on
  `30 - Ready for Development`; move them to `40 - Shipped` only after the corresponding runtime implementation and
  native evidence pass.
- iOS and Android are the only supported product surfaces. Historical React Native Web evidence may explain an earlier
  decision, but it does not define a current frame, platform variant, or certification requirement.
- Use only the iOS simulator for capture, comparison, and Figma synchronization. Android remains a supported technical
  target, but it is not a second visual authority and must not be launched for Figma work.

## Inspection And Mutation

- Inspect exact nodes, variables, styles, components, instances, current runtime sources, and available libraries before
  creating or changing anything.
- Keep Figma writes sequential, incremental, idempotent, and bounded to the owning page or node.
- Reuse semantic variables, text and effect styles, local components, variants, and icon instance swaps. Do not detach
  instances or duplicate an existing component family.
- Correct a shared defect on its semantic token or main component before changing a composition. Every proven repeated
  responsibility in a canonical screen uses a linked instance when a matching family exists. Keep genuinely one-off
  business compositions local instead of creating a prop-heavy generic component.
- Preserve a minimum 44-point interactive target. Keep safe-area and system differences explicit for every platform
  included in the owning task.
- Every variable, token category, component family, lifecycle page, and screen state requires evidence from the
  canonical Figma file, current runtime source, or an owning accepted issue.
- Return every changed node ID and immediately verify naming, properties, bindings, fonts, metadata, instance linkage,
  accessibility, and rendered screenshots.
- Stop after a failed mutation, ambiguous result, missing prerequisite, or genuine decision fork. Do not continue
  writing blindly.
- Do not introduce automatic or bidirectional Figma/code synchronization.
- Code Connect remains deferred until a roadmap task explicitly authorizes it and stable published components exist.

## Fidelity And Evidence

- Compare Figma with the running application at the same native viewport, platform, theme, authentication mode, sanitized
  fixture, and state.
- A roadmap task may limit runtime visual evidence to a smaller platform set for resource reasons. Record the exact
  platforms exercised. An explicitly assumed parity platform may guide design decisions, but it must never be reported
  as launched, observed, or certified.
- Validate loading, empty, error, disabled, destructive, sheet, toast, keyboard, scrolling, and platform-specific states
  where current evidence makes them reachable. Figma alone cannot prove interaction behavior.
- Missing runtime data, authentication, provider state, font, entitlement, simulator, or physical-device evidence is a
  blocker for that state. Report it instead of inventing a bypass or fake proof.
- Use sanitized data only. Never write credentials, access tokens, personal profiles, private identifiers, or production
  payloads into Figma or repository documentation.
- Record durable architecture and scope in repository documentation. Keep transient screenshots and local credentials
  outside Git.

## Closure

The final report identifies the canonical file, changed or consumed node IDs, runtime sources, viewports, platforms,
authentication modes, states, validations, intentional normalization, blockers, and skipped evidence. Complete and
publish each roadmap task separately through the repository GitFlow.
