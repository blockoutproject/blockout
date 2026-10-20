# Implementation Plan: Private support and suggestions

**Branch**: `tech/54-private-support-plan` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: [#54](https://github.com/blockoutproject/blockout/issues/54) and the owner-approved preparatory plan. This delivery formalizes the design and contract; it does not implement the application or configure providers.

**Status**: Planning dossier with the scoped prototype and Figma approvals recorded below. Native and provider qualifications remain future implementation checks.

## Summary

Provide one shared private problem/suggestion form to guests and signed-in people. The existing backend validates the whole multipart submission, creates a private GitHub issue and attaches every selected image through the official CLI. Confirm only a complete case. Otherwise preserve the form and permit explicit retry, accepting rare duplicate issues for manual closure. No mobile receipt lookup or persistent recovery mechanism.

## Technical Context

**Language/Version**: Java 25 / Spring Boot 4.1.1; TypeScript / Expo SDK 57 / React Native 0.86 / React 19.2.3, under [F13](../003-shared-quality/plan.md).

**Primary Dependencies**: Spring MVC/RestClient, Java ProcessBuilder and ordinary image decoding; official GitHub CLI 2.102.0 in the future backend image. Existing React Hook Form/Zod, TanStack Query and SDK-compatible Expo ImagePicker/ImageManipulator. The CLI is an invoked binary, not a new service or Java SDK.

**Storage**: GitHub private issues and native attachments only. Current mobile draft and private backend temporary files are transient. No SQL ticket table, parallel image store, support backup or migration.

**Testing**: JUnit/Spring MVC with controlled provider/process boundaries; Jest Expo/React Native Testing Library; native image and real private-provider qualification. Current repository verification covers documents and OpenAPI.

**Target Platform**: Existing Linux backend, native iOS/Android mobile, GitHub Cloud and a private Discord webhook.

**Project Type**: Mobile application and existing modular backend.

**Performance Goals**: Bounded upload/provider waits, without a latency promise or speculative load/capacity programme.

**Constraints**: Five PNG/JPEG files, each at most 5 MiB after preparation; complete acceptance; confidential storage and diagnostics; no automatic resend, receipt registry, mobile status read, support history or post-confirmation editor. Current global access gates remain effective.

**Scale/Scope**: One intake operation for problems and suggestions, private operator handling and an independent generic signal. No provider configuration, application implementation, tasks or automatic merge/closure.

## Constitution Check

The initial approved baseline permitted this scoped planning feedback loop. Both scoped approvals below are now recorded; the post-design check passes within this planning-only scope.

| Principle         | Application                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification | F10 owns the synchronous submission and explicit-retry behavior; current requirements integrate these decisions without session narration.                                                                     |
| II — Ownership    | F11 owns privacy and exceptional rights handling, F12 global access and F13 common controls/diagnostics. Their affected support/backup statements are reconciled.                                              |
| III — Design      | Prototype `14f88bb` and its scoped Figma reconciliation were explicitly approved in this conversation on 2026-10-15. The exact affected references appear below; provider/native behavior remains unqualified. |
| IV — Contracts    | Extend the canonical mobile root with one multipart operation and shared errors. No copied contract, bespoke encoder or generated-output patch. Integration generation/compilation remains to qualify.         |
| V — Simplicity    | Native GitHub issues/attachments, ordinary labels, one HTTP form submission and manual exceptional cleanup. No durable ticket/work registry, background retry or storage synchronization.                      |
| Prerequisites     | Native blockers #44 and #45 are closed. Private provider configuration and qualification are future implementation prerequisites, not claimed executions.                                                      |

## Project Structure

### Documentation

```text
specs/012-reports-feature-suggestions/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/README.md
└── quickstart.md
```

### Source code (planned, not initialized)

```text
apps/backend/   # support validation, GitHub/CLI adapter and independent Discord signal
apps/mobile/    # shared support form and existing image control
contracts/http/mobile/support/
├── paths.yaml
└── schemas.yaml
```

Keep F10 inside the existing applications. Generated DTOs stay at the HTTP boundary. There is no collector integration, new deployable or database schema.

## Complete submission and provider boundary

Bind metadata JSON and repeated image parts with Spring MVC. Validate all fields/files before any provider call: required nonblank text, reply-email syntax, optional classification, allowlisted context, file count, actual PNG/JPEG type, size and decoding. The canonical schema bounds title, description, reply email and context strings. The owner-approved UTF-16 counting rule in FR-004 matches native Java/Zod length validation; title/reply-email normalization runs during JSON binding before Bean Validation. Reuse these constraints in ordinary form/server validation, without truncating submitted content. Configure Spring multipart limits to 5 MiB per file and 26 MiB per request, including metadata and multipart overhead; align reverse-proxy limits with this request. Image decoder checks must not trust filename/MIME or allocate without inspecting image dimensions. The owner approved a 64 MiB decoded-buffer budget on 2026-10-20: reject inputs whose conservative raster and three-row estimate, `8 × width × (height + 3)` bytes, exceeds that budget before native decoding. This bounds admitted image buffers, not total JVM heap usage. A rejected request creates no provider effects.

Ordinary support sends omit Authorization and do not obtain or renew credentials, so failed or expired sign-in cannot prevent sending. Use the existing Spring resource-server chain with public authorization for this operation: a supplied invalid token still returns 401. When personal maintenance bypass is explicitly requested, use the existing F12 header, credentials and admission checks; an active bypass requires a usable account and current permission. No support-specific security chain or credential validator is needed. Treat optional account/target references as declarations, never ownership evidence or permission to query private account details. Minimum-version and other access gates remain unchanged.

Generate one opaque request UUID and include it in the private case. The dedicated repository and labels are fixed server configuration. For a submission with images, create the issue as incomplete through REST, invoke `gh issue edit --attach` for all validated files, then mark complete through the ordinary GitHub label API. Preserve the original title/body and any successfully attached references; do not overwrite them with a stale body when changing labels. With no image, create the case complete directly.

Only after every required attachment and the complete marking succeed may the backend return `201`. A single bounded read of the already-known issue can establish the final marking after an ambiguous response during that request. No old-attempt search, upload replay, transaction spanning external calls or rollback of uploaded files. A timeout or process interruption can leave partial or complete private effects. Manual closure handles incomplete attempts and exceptional duplicates.

Invoke the pinned official CLI with ProcessBuilder arguments, a server-selected repository/issue reference and generated technical filenames. Credentials come from the process environment, not command arguments. Keep temporary files private and remove them in final cleanup; bound process and HTTP waits and terminate a timed-out child before cleanup. Do not forward raw CLI output or provider bodies into diagnostics. No durable attachment volume or crash-recovery file catalogue.

After complete receipt, attempt the private Discord webhook with `wait=true`, containing only a generic signal and a link to the private request list. Bound the attempt; its failure changes neither acceptance nor the complete marking. F13 diagnostics record safe stage/environment/outcome/reason, excluding contact, content, attachments and credentials. Existing observation handles configuration failures; no support-specific incident engine.

## Mobile and HTTP behavior

React Hook Form owns the current editable draft; TanStack Query owns the single submission mutation under F13's disabled automatic retry/reconnection policy. Freeze the send snapshot and disable duplicate submission while sending. On ordinary error, retain the form and permit correction/retry. On complete confirmation, offer the existing return action and explain that replies use email. Leaving or restarting proves neither cancellation nor failure; do not restore a receipt or prior submission.

Use the shared image control, preserving support's multiple-image semantics. ImagePicker does not impose square editing; ImageManipulator performs a bounded preparation preserving proportions. A failed or oversized result remains an explicit selection error until replacement/removal, never an omitted file. Native file references are submitted through ordinary FormData rather than base64 JSON. Temporary picker UI does not discard the current form. Account/session change discards private input, invalidates callbacks and prevents a late response from changing the new form.

The [canonical contract](contracts/README.md) owns the exact operation, enum values, fields and responses. The backend supplies one operation to the mobile; GitHub is not exposed as a client API. Existing generated Java/TypeScript clients and validators remain authoritative. No `Location` is invented for a resource with no mobile read route, and no private GitHub URL is returned. The shared unavailable response now delegates retry behavior to each operation rather than imposing a read-before-retry on F10.

## Privacy, recovery and shared owners

GitHub is the sole durable support store. Operators need repository access, reply by email and close issues manually. Application administrators acquire no GitHub rights. Closing a case does not delete its images; no periodic purge or independent Blockout support backup is organized. PostgreSQL dumps do not cover this content, and GitHub recovery capabilities are the explicit limit.

Exceptional privacy requests follow [F11](../004-advertising-privacy-legal/spec.md#rights-and-information). Actual private attachment access and the applicable image-erasure procedure must be qualified before real use. Neither unlinking an image nor deleting a business account proves its provider erasure. These are provider qualification conditions, not a new user journey.

| Owner   | Reconciliation                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| F05/F09 | Session isolation and evidence rules remain unchanged; entered email or account reference authorizes no account or entitlement operation.       |
| F08/F07 | Support does not count as a link report and creates no personal inbox notification.                                                             |
| F11     | Complete acceptance, ordinary explicit retry, private GitHub storage, generic Discord signal and manual rights handling.                        |
| F12     | Global maintenance/unavailable/update gates retain precedence; ordinary sign-in failure does not prevent support.                               |
| F13     | Shared image control and diagnostics retained; explicit support exception to independent backups and generic reread-after-interruption wording. |

## Design and qualification

The approved [prototype `14f88bb`](https://github.com/blockoutproject/product-prototype/commit/14f88bb) replaces simulated receipt recovery with ordinary send/error/retry. Existing fields, image interactions, confirmation and visual direction remain. The owner explicitly approved this revision and then its Figma reconciliation in this conversation on 2026-10-15.

Approved Figma references: [sending with the locked form](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5581-15954), [lost response with editable retry](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5581-16247) and [leaving during sending](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=4445-16590). The obsolete reopened-operation screen and persistent uncertain-outcome composition were removed. Published library controls and the existing support form pattern remain linked; no UI Library change was needed. No provider console, support history, receipt screen or new erasure journey is designed.

[Research](research.md) distinguishes documented official capabilities and inspected supplier code from actual integration evidence. [Qualification scenarios](quickstart.md) cover complete/partial uploads, privacy, lost responses, session isolation, native images and multipart generation. Documentation checks do not establish native sending, permissions, erasure or runtime compilation. No constitutional exception is requested.
