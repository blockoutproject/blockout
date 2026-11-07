# Quickstart: Validate private support and suggestions

Use the [repository verification commands](../../README.md#verification) and the [canonical contract](contracts/README.md). The [plan](plan.md) and [data model](data-model.md) own implementation decisions and lifetimes.

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
| Design                  | Approved affected screens in both themes, narrow width, keyboard, reader labels and large text.                                                        | Sending is bounded, errors ordinary and draft retained. No recovery/history journey or third-party console recreated.                                                               |

Use JUnit/Spring MVC with controlled provider/process I/O and Jest Expo/React Native Testing Library for application behavior. Actual CLI uploads, private permissions and native image handling require their corresponding provider/device setup. No database ticket exists to justify an F10 persistence suite, and no additional E2E framework is selected.

## Owner-integrated form and admission (US1)

Run the form/admission boundary after contract generation:

```sh
npm run test --workspace=@blockout/mobile -- --runInBand --runTestsByPath src/features/support/__tests__/support-owner-integration.test.tsx
```

Exercise the form and access rows through the actual application root, F05 session, F12 admission, F13 transport and support routes. Expect no credential acquisition on ordinary preparation/sending, no direct-route bypass of global gates, reliable allowlisted context and no ownership authority from a declared contact or account. Controlled 201 responses establish client behavior, not real private receipt.

## Native attachments and current-visit lifetime

On iOS and Android native builds, select fictional landscape and portrait images, exercise picker return and preview dismissal, then replace/remove a failed preparation. Expect original proportions, reachable native Modal controls, explicit refusal until every selection is ready and retained text/other valid images. Use exact 5 MiB prepared files and a refused sixth selection. Test abandonment, restart and account changes independently of temporary picker navigation.

## Complete-receipt backend

Run the backend validation, generated endpoint, provider adapter and child-process boundaries through [README verification](../../README.md#verification). Exercise partial attachments, ambiguous final marking, process timeout/interruption and cleanup. Expect 201 only after complete marking, no automatic replay, and private originals removed only after child termination is confirmed. Local CLI execution uses the authorized host installation. Actual upload permissions and exceptional provider erasure require an authorized private test destination; controlled process tests need neither hosted deployment nor a reverse proxy.

### Controlled local multipart and attachment tooling

Install and resolve the isolated official CLI using [local support attachment CLI](../../infra/operations/README.md#local-support-attachment-cli) before starting the JVM. Check its resolved path, exact `2.102.0` version and `issue edit --attach` availability. These checks use no upload credentials and establish no real attachment behavior.

After `npm ci`, generate the actual TypeScript consumer and run the existing support suites, including the cross-language case:

```sh
npx nx run mobile:generate --output-style=static
mkdir -p apps/backend/target/tmp
BLOCKOUT_SUPPORT_CONSUMERS_TEST=true ./mvnw -B -ntp -pl apps/backend verify \
  '-Dtest=Support*Test,CreateSupportRequestTest,GitHub*Test,DiscordSupportSignalTest,!*IntegrationTest' \
  '-Dit.test=Support*IntegrationTest' \
  "-DargLine=-Djava.io.tmpdir=$PWD/apps/backend/target/tmp"
```

`SupportMultipartIntegrationTest` starts the actual servlet, generated Java binding, controller, validation and complete-send use case on a random loopback port. Only provider effects, current admission and an isolated signing-key issuer are controlled. It asserts every metadata field and all five original PNG/JPEG byte sequences before complete marking, exact **27262976-byte** acceptance and **27262977-byte** refusal, and exact **5242880-byte** file acceptance and **5242881-byte** refusal. Legal trailing JSON whitespace supplies request padding; Spring owns multipart encoding, including overhead. Refusals assert canonical problem bodies/no-store headers and no provider effects. Each case checks private-original cleanup.

The opt-in method launches `support-multipart-integration.test.ts` with the existing Jest Expo runner and the server's random URL. The real Orval client, FormData hook, Fetch adapter and generated success validator reach that same backend; only native Expo networking is replaced with Node's ordinary Fetch/FormData. It checks complete metadata/five distinct originals, one success validation, 400/401/403/413/415/422/503 and privacy/authentication headers. The controlled 403 is a real locally signed principal refused by the admission double; 503 is a controlled provider refusal. Without the opt-in flag the backend skips this method, and ordinary mobile Jest skips the suite without its Java-owned server URL. Generate mobile output first: backend-only verification normally generates Java, not TypeScript. Child output stays in ignored `apps/backend/target/support-multipart-consumers.log`; no fixed port, database, proxy or native device is needed.

Existing provider/process suites qualify fictional credentials in the child environment, bounded HTTP/process waits, separate arguments, private temporary permissions, termination before cleanup and partial-failure refusal. The controlled child is Java, not an actual `gh` upload. Official binary/version checks, these controlled suites and the local roundtrip do not complete T033, T041 or F10: actual private attachment permissions/erasure and native networking/image preparation remain separately qualified.

## Explicit mobile submission

```sh
npm run test --workspace=@blockout/mobile -- --runInBand --runTestsByPath src/features/support/__tests__/support-submission.test.tsx
```

Exercise the real form and generated multipart consumer with a delayed refusal followed by an explicit corrected retry. Expect locked in-flight fields/action, retained editable input after failure and complete confirmation with email information and no editor after 201. Repeat on native iOS/Android with both themes, keyboard, enlarged text and VoiceOver on iOS. A fixture response does not qualify actual multipart delivery, attachment confidentiality or provider erasure.
