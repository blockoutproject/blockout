# Quickstart: Validate private support and suggestions

Use the [repository verification commands](../../README.md#verification) and the [canonical contract](contracts/README.md). The [plan](plan.md) and [data model](data-model.md) own implementation decisions and lifetimes. Native accessibility verification follows [F13 FR-030](../003-shared-quality/spec.md#platforms-accessibility-and-bounded-continuity).

## Prerequisites

Install F13's selected Java/Expo dependencies and generate the actual clients before dependent lint, TypeScript, tests and exports. Serialize generation with Metro/lint reads while Orval cleans generated output.

Controlled application checks use fictional contact, text and images with native SDK/storage/HTTP/provider-process inputs controlled at their boundaries. Real sending requires an authorized isolated private support repository, pre-created intake labels, a repository-scoped server token, CLI 2.102.0 and a private Discord webhook. Verify actual attachment permissions and authorized/unauthorized image-byte access before real support content is accepted. Qualify the applicable exceptional image-erasure procedure; issue closure is insufficient.

## Essential scenarios

| Boundary                | Exercise                                                                                                                                               | Expected result                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Form and access         | Guest, signed-in person, failed sign-in, explicit maintenance bypass with valid/missing/expired credentials or revoked rights, and other global gates. | Ordinary sending obtains no token. Bypass follows F12; invalid supplied credentials return 401, insufficient rights 403. No other gate is bypassed.                                 |
| Input bounds            | Malformed email, blank text, exact/over-limit title, description and context, Unicode, five images and total multipart size.                           | Ordinary validation preserves the form and refuses excess before provider calls. The maximum accepted composed issue, including attachment references, succeeds without truncation. |
| Images                  | Zero/five/six files, exact 5 MiB and oversized files, corrupt or disguised formats, orientation, preparation failure and replacement/removal.          | Every selected file must be ready. Proportions/legibility survive native preparation; no silent omission, forced square crop or compression loop.                                   |
| Complete intake         | Send text only, then several images; fail a later upload or complete marking.                                                                          | Only a fully attached, complete-marked case produces `201`. Partial attempts remain private and recognizable. No automatic replay or rollback claim.                                |
| Lost response           | Lose the response after acceptance; explicitly retry with retained or corrected input.                                                                 | Ordinary error and editable form, no receipt lookup. Any exceptional duplicate is a separate private case, closable manually.                                                       |
| Form lifetime           | Double tap, leave while sending, abandon, restart and change account before response.                                                                  | One concurrent send; no cancellation claim or restored receipt. No old draft/response crosses the account/session boundary.                                                         |
| GitHub privacy          | Open native attachments with authorized, unauthorized and signed-out sessions.                                                                         | Only repository-authorized readers obtain the bytes. Verify with actual permissions, not Markdown appearance.                                                                       |
| Discord and diagnostics | Fail the webhook after successful receipt; inspect logs and process invocation.                                                                        | User acceptance unchanged. Generic signal only; no personal content, token, raw CLI output or attachment bytes in diagnostics/arguments.                                            |
| Temporary files         | Normal completion, validation refusal, CLI failure and timeout.                                                                                        | Fixed repository and separate arguments, private temporary files, terminated timed-out process and cleanup; no durable support volume.                                              |
| Contract integration    | Bundle/lint, generate and compile Java/TypeScript; exercise metadata JSON, repeated file parts and named errors.                                       | Standard generated bindings/FormData work without output patches; complete response validated once, additive fields tolerated.                                                      |
| Design                  | Approved affected screens in both themes, narrow width, keyboard, accessible labels and large text.                                                    | Sending is bounded, errors ordinary and draft retained. No recovery/history journey or third-party console recreated.                                                               |

Use JUnit/Spring MVC with controlled provider/process I/O and Jest Expo/React Native Testing Library for application behavior. Actual CLI uploads, private permissions and native image handling require their corresponding provider/device setup. No database ticket exists to justify an F10 persistence suite, and no additional E2E framework is selected.

## Private-provider qualification matrix

T035 prepares these cases; T041 executes them only with separate authorization for an isolated private destination and fictional contact, text and PNG/JPEG images. Reuse the essential scenarios above and the [operator configuration and handling](../../infra/operations/README.md#support-destination-configuration). Record each result as **passed** only when its actual observation satisfies the expectation, **failed** when it contradicts it, or **unavailable** when authorization, access, tooling or evidence is missing. Controlled tests and documentation do not establish a provider pass. Failed/unavailable privacy or erasure cases block real support activation.

| Boundary                    | Actual exercise and required observation                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token and fixed destination | With the host-run backend and CLI 2.102.0, create, attach, mark complete and read the same fictional case using a fine-grained PAT restricted to the test repository. Record the effective repository role and minimum working token permissions privately; distinguish issue/label rights from upload rights. Verify a read/triage-only principal cannot upload and no input selects another repository or webhook.                                                                     |
| Image bytes                 | Retrieve every attached image from a complete case and successful files from a partial attempt in separate authorized, unauthorized signed-in and signed-out sessions without shared credentials/cache. Exercise the original attachment URL and its redirects, not just the issue page or Markdown. Authorized readers obtain the expected fictional bytes; the other sessions obtain none, including by reusing a known URL.                                                           |
| Partial intake              | Reuse the complete-intake/lost-response cases with an actual later-upload failure and failed/ambiguous complete marking. Observe preserved successful references, no false `201`, private partial bytes and intake labels independent of open/closed state. Reuse the manual incomplete/duplicate procedure; no replay or rollback is inferred.                                                                                                                                          |
| Maximum composed content    | Submit exactly 200 UTF-16 title units, 10,000 description units, a valid 254-unit reply address and maximum accepted contextual strings (256 units each), including supplementary Unicode, plus five admissible fictional images. Compare accepted text/context and all five attached references with the composed provider case: no truncation, omitted reference or split case. Reuse the input-bounds refusal cases for excess.                                                       |
| Exceptional erasure         | Use the [manual rights and ticket/file procedure](../../infra/operations/README.md#private-support-intake-and-replies) on fictional complete and partial cases, including a closed case. Obtain the applicable provider action/acknowledgment and independently check the previously working image-byte URLs with authorized access. A denied unauthenticated read, removed link or closed/deleted issue alone proves no erasure; unresolved provider removal stays unavailable/pending. |
| Private secondary signal    | Inspect the real private webhook message after complete receipt: only the generic signal and fixed private request-list link, with no submitted title/contact/context, image, attachment URL or case content. Reuse the failed-webhook case: acceptance and complete marking remain valid, and diagnostics contain only safe outcomes.                                                                                                                                                   |

Keep exact private repository/case/file URLs, credentials, attachments, provider replies and raw diagnostics solely in the authorized private evidence destination. Public chat/PR evidence reports only safe build/source identifiers, case outcomes and remaining limits; it contains no raw private evidence.

## Owner-integrated form and admission (US1)

Run the form/admission boundary after contract generation:

```sh
npm run test --workspace=@blockout/mobile -- --runInBand --runTestsByPath src/features/support/__tests__/support-owner-integration.test.tsx
```

Exercise the form and access rows through the actual application root, F05 session, F12 admission, F13 transport and support routes. Expect no credential acquisition on ordinary preparation/sending, no direct-route bypass of global gates, reliable allowlisted context and no ownership authority from a declared contact or account. Controlled 201 responses establish client behavior, not real private receipt.

## Native attachments and current-visit lifetime

On iOS and Android native builds, select fictional landscape and portrait images, exercise picker return and preview dismissal, then replace/remove a failed preparation. Expect original proportions, reachable native Modal controls, explicit refusal until every selection is ready and retained text/other valid images. Use exact 5 MiB prepared files and a refused sixth selection. Test abandonment, restart and account changes independently of temporary picker navigation.

## Complete-receipt backend

Run the backend validation, generated endpoint, provider adapter and child-process boundaries through [README verification](../../README.md#verification). Exercise partial attachments, ambiguous final marking, process timeout/interruption and cleanup. Expect 201 only after complete marking, no automatic replay, and private originals removed only after child termination is confirmed. Local CLI execution uses the [authorized host installation](../../infra/operations/README.md#local-support-attachment-cli). Actual upload permissions and exceptional provider erasure require an authorized private test destination; controlled process tests need neither hosted deployment nor a reverse proxy.

After `npm ci`, generate the TypeScript consumer and enable the generated-consumer integration case:

```sh
npx nx run mobile:generate --output-style=static
mkdir -p apps/backend/target/tmp
BLOCKOUT_SUPPORT_CONSUMERS_TEST=true ./mvnw -B -ntp -pl apps/backend verify \
  '-Dtest=Support*Test,CreateSupportRequestTest,GitHub*Test,DiscordSupportSignalTest,!*IntegrationTest' \
  '-Dit.test=Support*IntegrationTest' \
  "-DargLine=-Djava.io.tmpdir=$PWD/apps/backend/target/tmp"
```

With this flag, the backend suite runs the generated TypeScript consumer and actual support form against its local server; otherwise those cases are skipped. Provider HTTP and child-process effects remain controlled: these checks do not establish real uploads, private permissions, manual provider closure or erasure.

## Explicit mobile submission

```sh
npm run test --workspace=@blockout/mobile -- --runInBand --runTestsByPath src/features/support/__tests__/support-submission.test.tsx
```

Exercise the real form and generated multipart consumer with a delayed refusal followed by an explicit corrected retry. Expect locked in-flight fields/action, retained editable input after failure and complete confirmation with email information and no editor after 201. Repeat on native iOS/Android with both themes, ordinary form keyboard/focus and enlarged text. A fixture response does not qualify actual multipart delivery, attachment confidentiality or provider erasure.
