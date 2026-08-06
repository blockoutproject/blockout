# Repository Figma Interaction Policy

Read this policy before any product-design task that reads from, writes to, compares against, or makes a decision in
Figma. This includes visual discovery, token or component work, code-to-Figma calibration, Figma-to-code
implementation, and visual reconciliation.

## Authority

- The live Roadmap declared by the repository overlay controls task existence, status, priority, execution mode,
  ownership, and claims; the selected issue controls scope, dependencies, Workset, and acceptance evidence.
- Runtime source and the running supported application surfaces control behavior, routes, authorization, data flow,
  copy, accessibility, platform integration, and available states. Figma cannot activate or redefine them.
- The durable design-system authority selected by the repository router defines the relationship between canonical
  Figma assets, current runtime source, reusable components, and task-level evidence.
- The repository design profile names the only canonical design file. Do not create a parallel canonical file.
- The canonical Figma file controls visual composition. The application remains the authority for behavior and platform
  functionality.
- Owning issues, pull requests, Git history, and Figma version history retain detailed certification and delivery
  evidence. Do not recreate that task history in repository documentation.

## Entry Gate

1. Read the owning roadmap task, the applicable design-system model, relevant runtime sources, this policy, the
   platform policy, and the applicable Figma skills.
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

- Inspect the worktree and every runtime component named by the repository runtime profile before starting a
  reconciliation task. After a machine restart, assume processes are stopped until inspection proves otherwise.
- For an isolated task, derive the smallest complete dependency set from the target state. For a sequential
  screen-by-screen reconciliation roadmap, start the complete topology and client declared by the repository runtime
  profile. Verify health before attempting authentication or navigation.
- Record which processes the task started. Keep the healthy session alive through source inspection, Figma mutation,
  focused corrections, and final visual QA. Do not tear it down after the first capture or restart healthy services for
  each Figma adjustment.
- Preserve processes that were already running for the user. Across consecutive Figma screen tasks, also retain the
  healthy task-owned application stack, development-server session, browser, device, or simulator instead of stopping
  and reconstructing them after every task. Stop them only on user request, at the end of the reconciliation series,
  or to replace a failed process.

### 2. Capture runtime and source truth

- Navigate the configured visual capture runtime to the exact route, state, theme, and authentication mode before
  changing Figma. Use the normal provider flow and an existing least-privilege test identity; never add a bypass or
  record account details.
- If a provider consent prompt appears, the agent may select its visible acceptance action and continue. Never encode
  or fake that provider state in application source, configuration, or committed evidence.
- Record the browser, device, simulator, or other render target, its actual logical viewport, and the canonical Figma
  viewport. When the runtime cannot render the canonical dimensions exactly, normalize a transient capture
  proportionally for measurement and document both dimensions. Never compare mismatched frames silently.
- Capture one complete screen and focused references for dense or reusable controls. Keep captures transient and
  outside Git.
- Read the exact screen source, every shared component it renders, theme tokens, icon-library entries, and reachable
  variants. Build a short source-to-Figma inventory before writing: component owner, sizes, treatments, states,
  optional slots, dimensions, spacing, typography, colors, borders, gradients, shadows, and interaction-only behavior.
- Distinguish runtime defects from delivered intent. Do not normalize a visible discrepancy until source, runtime,
  and existing design-system evidence justify the correction.

### 3. Inspect the existing Figma model

- Inspect the exact screen frame and validation label, then trace every repeated element to its main component,
  component set, variant, properties, variables, styles, and icon master.
- Compare a reusable component's complete source API, not only the one variant visible on the target screen. Check all
  source-backed sizes, treatments, states, left and right slots, indicators, disabled behavior, and interactive state
  before declaring the Figma family complete.
- Verify exact icon paths against the icon library pinned by the repository profile. Import or reuse editable vectors
  through instance-swap properties; never approximate an icon with primitives or a screen-local overlay.
- Attempt the exact product font once. If Figma still reports `hasMissingFont`, retains stale text metrics, or produces
  no render bounds, use the portable fallback selected by the repository design profile in reusable Figma masters.
  Reapply the text, verify reflow and `hasMissingFont=false`, and record that the runtime source remains the
  system-font authority.

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
- Reconcile every coverage-ledger cell against its referenced frame, shared consumer list, component variant, or
  evidence-backed omission. A missing node, stale reference, unsupported equivalence, or unreviewed high-risk state
  fails the pass.
- Confirm that no detached duplicate, invented decoration, placeholder, hidden obsolete layer, or screen-local repair
  remains.

**Visual pass**

- Compare the complete runtime capture and Figma frame when an implementation exists, then inspect each reusable or
  interactive region at close zoom. Check text baselines and wrapping, icon box and optical alignment, horizontal and
  vertical centering, padding,
  gap, border width, radius, gradient direction and stops, opacity, shadow, and adjacent spacing.
- Measure geometry instead of relying only on visual impression. Re-render the component master and the complete screen
  after the final correction.
- Regression-check only consumers affected by changed shared ownership. Do not reopen unrelated screens.
- Keep a frame `Validation pending` until both passes succeed against the applicable authority. For a net-new screen
  without runtime implementation, require the accepted product behavior, the canonical design system, and explicit
  reviewer approval instead of inventing runtime evidence. A structural audit or a visually plausible screenshot
  alone is insufficient.

### 6. Close once

- Record the final node IDs, source files, runtime state, dimensions, checks, intentional normalization, and remaining
  external limitations in the owning evidence.
- After final Figma and runtime QA, keep the healthy task-owned session alive when the next authorized screen task will
  reuse it. Otherwise stop only task-owned processes and report what remains running.
  Do not stop user-owned infrastructure implicitly.
- Publish the roadmap task only after the final full-frame render, focused component renders, repository checks, and
  worktree review all pass.

## Direction Of Work

### Visual discovery and code-to-Figma calibration

- Treat the shipped application and runtime source as the authority for delivered behavior and reachable states.
- Produce a clean normalized design-system composition. Do not reproduce incidental alignment drift, duplicated styles,
  unsupported-surface defects, or one-off values as new design rules.
- Preserve the current product identity, information hierarchy, copy, and platform boundaries declared by the
  repository design profile.

### Figma-to-code implementation

- Inspect the exact approved node and current runtime source before editing code.
- Treat Figma as visual input within the owning roadmap task, not as authority for contracts, permissions, data,
  navigation, hidden states, or provider behavior.
- Preserve accessible platform behavior when a static composition cannot represent it.
- Once a roadmap task explicitly certifies the complete Figma system as its sole visual authority, consume those
  variables, styles, component APIs, and canonical frames without recalibrating their geometry from the pre-adoption
  runtime. Runtime checks still protect behavior, accessibility, navigation, providers, and platform integration.

## File And Lifecycle Structure

- Keep one canonical design file with the name declared by the repository design profile.
- The repository design profile owns supported product surfaces and the visual capture authority. Historical evidence
  from another surface may explain an earlier decision, but it does not define a current frame, platform variant, or
  certification requirement.

### Required Top-Level Pages

Use three-digit numeric prefixes so lexicographic ordering remains stable and each responsibility can grow without a
file-wide rename. Reserve the following ranges unless the repository design profile supplies equivalent exact names:

1. `000–099` — orientation and file guidance. Keep `000 - Cover` for purpose, ownership, navigation, and current
   design-system status. Add pages such as `010 - Getting Started` only when durable guidance exists.
2. `100–199` — foundations. Keep `100 - Foundations` for the shared foundation overview. When real content justifies
   dedicated pages, prefer `110 - Colors`, `120 - Typography`, `130 - Spacing & Layout`,
   `140 - Radius & Effects`, and `150 - Icons`.
3. `200–299` — reusable component families. Use the category bands `210–219` for actions, `220–229` for status and
   badges, `230–239` for inputs, `240–249` for navigation, `250–259` for feedback, `260–269` for data display,
   `270–279` for overlays, and `280–289` for structure. A category may use its anchor or additional numbers in its
   band for focused component pages.
4. `300–399` — reusable product patterns and cross-component compositions. Start with `300 - Patterns` or a more
   specific name when the page already has a bounded pattern responsibility.
5. `400 - In Design` — exploratory, incomplete, unapproved, or reviewer-returned screen families.
6. `500 - Ready for Development` — exact screen nodes explicitly approved for implementation.
7. `600 - Shipped` — exact screen nodes reconciled with the delivered runtime and its supported platforms.

Gaps are intentional capacity, not missing pages. Do not create empty overview, category, or speculative pages merely
to occupy a reserved number. Divider pages may remain unnumbered. Do not use one undifferentiated components canvas:
group reusable masters and their guidance by stable responsibility. Typical families include buttons, badges,
separators, fields, selection controls, navigation items, alerts, dialogs, sheets, tables, cards, empty states,
skeletons, and error recovery.

### Lifecycle Gates

- New and materially revised screens start in `400 - In Design` with `Validation pending`, even when an agent produced
  a structurally valid render.
- An agent MUST NOT self-approve a screen or promote it because it looks plausible. Move exact nodes to
  `500 - Ready for Development` only after explicit reviewer approval of purpose, information hierarchy, component
  usage, viewport coverage, state coverage, copy, and visual composition, and only when the owning coverage ledger has
  no blank, ambiguous, or unresolved cell.
- Move nodes rather than duplicating independent copies across lifecycle pages. Preserve stable node identity and one
  canonical owner whenever the tool permits it.
- Return a rejected or materially changed Ready screen to `400 - In Design` before revising it. Any prior approval
  becomes stale when a change affects behavior, hierarchy, components, states, responsive composition, or visual
  treatment.
- Move a Ready screen to `600 - Shipped` only after implementation, supported-platform runtime comparison,
  accessibility review, and final visual reconciliation pass.

### Component-First Composition

- Inventory relevant variables, styles, components, component sets, and published libraries before creating a screen.
- Build screens with linked instances of existing components wherever a matching responsibility exists. Do not detach
  instances, redraw a reusable control locally, or approximate an existing icon or component with primitives.
- When a repeated responsibility has no suitable component, create or correct its owning component family before
  composing the screen. Define its bounded variants, states, slots, sizing, constraints, token bindings, and usage
  guidance on the appropriate component-library category page.
- Keep genuinely unique business compositions local. Repeated controls become components; one-off screen content does
  not become a speculative generic component.
- Buttons and similar controls hug their content by default, preserve the minimum interactive target, and use
  intentional parent alignment. Full-width controls require explicit responsive or product evidence; arbitrary wide,
  off-center, or screen-local button geometry is invalid.
- Specify every reachable component state that changes appearance, semantics, accessibility, or interaction in the
  owning component family. Evaluate default, hover, focus-visible, pressed, selected, disabled, read-only, loading,
  invalid, warning, success, and destructive treatments as applicable, together with every supported size and
  structurally distinct responsive treatment. Use component properties for content and optional slots instead of
  multiplying otherwise identical variants.
- Do not manufacture unsupported component-property combinations merely to complete a Cartesian product. Record
  disallowed or inapplicable combinations in the component guidance so their absence is explicit rather than
  accidental.

### Screen Families And State Coverage

Name every canonical frame `Domain / Screen / Viewport / State`. Group all frames for one screen family inside one
named section with a short design note that states purpose, owning behavior, representative scenario, data assumptions,
and any neighboring feature content shown only as a reference.

Coverage is exhaustive at the decision level even when frames are not duplicated. Before composing screens, place a
visible coverage ledger in the owning section. Give every relevant screen responsibility or scenario one row and every
supported viewport and reachable state one resolution. Each cell MUST resolve to exactly one of:

- a dedicated canonical frame and its exact node ID;
- a named shared canonical frame and the complete list of responsibilities or scenarios it covers;
- an owning component variant when the difference is entirely component-local;
- `Unreachable`, with the behavioral or source evidence;
- `Visually equivalent`, with the canonical frame that proves the equivalence.

Blank cells, implicit sampling, undocumented omissions, and generic labels such as `covered elsewhere` are invalid.
The ledger is navigation and review evidence; it does not become product behavior authority.

For every reachable screen family, evaluate and resolve the following state matrix:

- working or default state with realistic sanitized content;
- initial and refresh loading when their composition or feedback differs;
- recoverable and terminal error behavior with applicable recovery actions;
- empty, partial, read-only, disabled, blocked, validation, success, destructive, or permission states when reachable;
- compact, mobile, tablet, desktop, or other supported viewport variants whenever layout, navigation, density, order,
  disclosure, or interaction changes materially.

- Create a working/default canonical frame for every business responsibility or scenario whose content, information
  priority, copy, available action, progress, or recovery meaning differs, even when those frames reuse the same shell.
  Create its supported viewport counterparts whenever responsive treatment changes materially. A single representative
  responsibility is not evidence for the others.
- A shared loading, error, read-only, blocked, permission, or responsive frame may cover several responsibilities only
  when the rendered hierarchy, copy contract, actions, focus destination, recovery path, navigation treatment, and
  responsive behavior are genuinely identical. Name every consumer in the ledger and in the shared frame note.
- Create a dedicated frame whenever state changes content priority, navigation, blockers, actions, focus, feedback,
  disclosure, layout, or recovery. Keep control-only interaction differences in the owning component variants rather
  than duplicating complete screens.
- Do not generate the Cartesian product of content values that preserve the same behavior and composition. This
  exception reduces redundant artifacts; it never permits an unevaluated responsibility, viewport, or reachable
  state. Every intentionally omitted frame still requires one of the explicit ledger resolutions above.
- Treat authentication, authorization, payment, destructive action, irreversible submission, regulated content, and
  other high-risk journeys as exhaustive full-screen coverage unless current evidence proves that a shared frame is
  behaviorally and visually identical.

### Canvas Organization

- Place the coverage ledger and the section design note before the canonical frames in normal reading order. Keep
  shared-state frames in a clearly named shared group and keep responsibility-specific frames in their owning rows.
- Align related frames to a consistent row-and-column system, normally states on one axis and viewports on the other.
- Preserve at least 160 canvas pixels between sibling screen frames and at least 320 pixels between unrelated screen
  families or responsibility sections. Increase spacing for oversized frames; never overlap labels, notes, frames, or
  prototype connectors.
- Keep design notes and ownership annotations outside product UI bounds. Visually separate neighboring-feature
  composites, historical references, and rejected explorations from the owning canonical screen family.
- Order frames from default to exceptional states and from widest to most compact viewport unless the screen family
  documents a clearer sequence.
- Keep every screen fully inspectable at normal canvas zoom: no hidden overflow, clipped annotation, unexplained blank
  region, or ambiguous ownership.

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

- Compare Figma with the running application at the same logical viewport, platform, theme, authentication mode,
  sanitized fixture, and state.
- A roadmap task may limit runtime visual evidence to a smaller platform set for resource reasons. Record the exact
  platforms exercised. An explicitly assumed parity platform may guide design decisions, but it must never be reported
  as launched, observed, or certified.
- Validate loading, empty, error, disabled, destructive, sheet, toast, keyboard, scrolling, and platform-specific states
  where current evidence makes them reachable. Figma alone cannot prove interaction behavior.
- Missing runtime data, authentication, provider state, font, entitlement, browser, simulator, device, or other
  required platform evidence is a blocker for that state. Report it instead of inventing a bypass or fake proof.
- Use sanitized data only. Never write credentials, access tokens, personal profiles, private identifiers, or production
  payloads into Figma or repository documentation.
- Record durable architecture and scope in repository documentation. Keep transient screenshots and local credentials
  outside Git.

## Closure

The final report identifies the canonical file, changed or consumed node IDs, runtime sources, viewports, platforms,
authentication modes, states, validations, intentional normalization, blockers, and skipped evidence. Complete and
publish each roadmap task separately through the repository GitFlow.
