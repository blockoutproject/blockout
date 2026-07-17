# MRG-340 Reports Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operation: `REPORT-01`
- Owner: `reports-service`
- External providers: AWS S3, GitHub, and Discord
- Deferred consumers: mobile-gateway and Expo
- Production effect: none

## Purpose

MRG-340 activates the generated `ReportsApi` for canonical `POST /api/v2/reports` and replaces the mixed handwritten
Blockout DTO/service flow with application-owned report command, attachment, result, orchestration, and provider ports.
Generated request and response models are mapped immediately inside `ReportV2Controller`; Spring multipart types are
materialized into immutable application attachments before the use case runs.

The existing `/api/v1/reports` operation remains an isolated compatibility adapter. It uses a dedicated snake-case
mapper, delegates to the same application use case, and retains provider-shaped fields and caller inputs that are not
part of the canonical contract.

Reports-service has no downstream Blockout REST dependency. MRG-340 therefore creates no artificial internal client.
The generated reports-service client belongs to the mobile-gateway report workflow and remains explicitly deferred to
MRG-343. GitHub, Discord, and S3 are vendor integrations rather than Blockout contract clients.

## Boundary Ownership

| Concern                          | Owner and target                                                      |
| -------------------------------- | --------------------------------------------------------------------- |
| Blockout submission intent       | immutable `ReportCommand`                                             |
| Multipart attachment input       | immutable `ReportAttachment`                                          |
| Canonical submission result      | immutable `ReportResult` canonical fields                             |
| Submission use case              | `ReportSubmissionService`                                             |
| Side-effect orchestration        | `ReportSubmissionApplicationService`                                  |
| Attachment storage port          | `ReportAttachmentStorage`                                             |
| Durable issue port               | `ReportIssueTracker`                                                  |
| Best-effort notification port    | `ReportNotifier`                                                      |
| Generated transport mapping      | strict `ReportApiMapper`                                              |
| Canonical REST                   | generated `ReportsApi` behind `ReportV2Controller`                    |
| Legacy REST and casing           | `LegacyReportController`, records, and `LegacyReportsJson`            |
| S3 SDK and public object URL     | `S3ReportAttachmentStorage`                                           |
| GitHub SDK, labels, and Markdown | `GitHubIssueAdapter`, `GitHubIssuePayloadBuilder`, `GitHubIssueDraft` |
| Discord webhook JSON             | `DiscordReportNotifier` and `DiscordWebhookMessage`                   |

The generated shared `ReportTypeEnum` is the only report-category enum. Handwritten Blockout DTOs, the copied report
enum, the global reports-service snake-case strategy, handwritten `@JsonProperty` bridges, and the mixed
`ReportService` are removed. Vendor SDK and payload types occur only in infrastructure/configuration packages.

## Canonical And Legacy Contract Parity

| Area             | Canonical v2                                                                 | Retained v1                                                                  |
| ---------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| JSON part        | generated camelCase `CreateReportInternalRequest`                            | adapter-local snake_case JSON string                                         |
| User identifier  | optional positive numeric `int64`                                            | arbitrary optional string remains accepted                                   |
| Attachment URLs  | never caller supplied                                                        | `attachment_image_urls` remains accepted and embedded in initial GitHub body |
| Images part      | optional repeated `images`; PNG/JPEG and five-megabyte declared checks       | same part name, checks, empty-part skip, aggregate servlet limit             |
| Result           | issue `number`, `htmlUrl`, and `title`                                       | provider `id`, `number`, `html_url`, `title`, and `state`                    |
| Success          | `201`                                                                        | `201`                                                                        |
| Authorization    | bearer token plus `SCOPE_create:reports`                                     | unchanged bearer token and scope                                             |
| Invalid command  | generated validation and canonical `invalid_request` Problem Details         | manual parse/legacy behavior remains                                         |
| Provider failure | canonical `internal_error` Problem Details without implementation disclosure | retained five-field generic error map                                        |

Canonical validation follows the already approved source contract. It does not retroactively change v1 validation:
malformed legacy JSON and declared image-validation failures preserve their current legacy failure path. The v1
adapter remains the only owner of arbitrary string user IDs, caller-supplied attachment URLs, provider-global issue
IDs/state, and snake_case serialization.

The reports-service application mapper is no longer globally snake case. Canonical generated models therefore emit
camelCase without any handwritten naming annotation or recursive converter. The adapter-local mapper is the sole
snake/camel compatibility mechanism.

`ReportsCompatibilityTelemetry` observes only the exact v1 and v2 report paths. It records `REPORT-01`, route version,
caller cohort, status class, latency, and a bounded request identifier without reading multipart fields, JSON, images,
authorization values, or provider data.

## Provider Sequence And Partial Failures

The application service preserves the deployed order:

1. create one 32-character UUID-derived report key;
2. skip null/empty attachments and validate declared PNG/JPEG type and declared size;
3. upload remaining attachments sequentially to `reports/{reportKey}/{oneBasedIndex}.{extension}`;
4. create one durable GitHub issue with the current category label and Markdown context;
5. best-effort append uploaded public URLs to the GitHub issue body;
6. best-effort post the current issue number, title, and URL to Discord;
7. return the issue projection.

The task does not add a transaction, persistence row, idempotency key, attachment-count limit, retry, compensation,
or cleanup. Upload or GitHub-create failure still returns failure and may leave earlier S3 objects. GitHub body append
failure remains hidden by the GitHub adapter. Discord failure remains hidden after issue creation. Existing public S3
URLs, static credentials, regional URL shape, extension fallback, and synchronous clients remain unchanged.

The audited shared `RestTemplate` still forwards the inbound bearer token to Discord and the Discord adapter still
logs its configured webhook URL. Those are known security defects, not approved target behavior; MRG-409 owns their
focused correction with secret rotation/log evidence. Preserving the runtime sequence in MRG-340 does not approve the
defects or broaden production authority.

## Authentication, Errors, And Compatibility

Both routes retain the exact `create:reports` method authority. Missing/invalid bearer tokens and denied v1 requests
still use Spring's retained resource-server behavior. The canonical route uses reports-service Problem Details with
stable `authentication_required`, `forbidden`, `invalid_request`, `payload_too_large`, and `internal_error` codes plus
a bounded request identifier.

The aggregate request and per-file servlet limits remain five megabytes. The application-level image check still
examines declared content type and size rather than sniffing bytes. No rate limit, anonymous-BFF policy, M2M grant, or
abuse policy is changed because mobile-gateway remains the only proven caller and is not migrated in this slice.

## Provider-First Activation And Rollback

An eventual authorized deployment follows this order:

1. deploy reports-service with unchanged v1 and generated v2 routes;
2. validate v1 multipart JSON, response fields, errors, scope, S3 keys, GitHub labels/body/update, and Discord
   best-effort behavior;
3. validate canonical camelCase, numeric user identity, minimal result, validation, and Problem Details;
4. retain that dual-route image as the reports provider rollback baseline;
5. migrate the mobile-gateway report client only in MRG-343, then Expo only in MRG-347/MRG-515.

Before any v2 consumer is active, the standalone v1 reports image remains a valid rollback target. After the first v2
consumer is active, rollback uses the last-known-good dual-route image; returning reports-service to v1-only first
requires reverting every v2 consumer. This active goal performs no deployment, provider write, production snapshot,
or cutover.

## Coexistence And Temporary Names

- `api/v1`, `LegacyReportController`, the legacy records, and `LegacyReportsJson` remain only until every production
  caller migrates and approved zero-traffic evidence gates close.
- `api/v2` and `ReportV2Controller` are source-code coexistence names. After authorized v1 retirement, the surviving
  canonical source names become unqualified.
- The public canonical `/api/v2/reports` route remains stable after source-code coexistence names disappear.
- Generated adapter boundaries, application records/ports, strict mapping, and vendor infrastructure adapters remain
  part of the target architecture.
- Reports-service has no Flyway history or relational persistence in this slice.

The active goal stops before Phase MRG-900 and therefore neither performs nor authorizes legacy production removal.

## Verification Evidence

- Application tests prove sequential upload numbering, issue creation, image append, notification order, empty-part
  handling, PNG/JPEG and size validation, upload stop behavior, and non-blocking Discord failure.
- Transport tests prove generated interface ownership, canonical command/result mapping, numeric identity, minimal v2
  response, exact legacy snake-case request/response fields, arbitrary legacy user text, and multipart isolation.
- Provider projection tests prove retained GitHub label, context Markdown, description, and caller-supplied legacy URL
  formatting.
- Source confinement proves no handwritten `@JsonProperty`, global snake-case strategy, Blockout DTO copy, duplicate
  report enum, or vendor SDK reference outside infrastructure/configuration remains.
- Focused reports tests, generated server compilation, contract tests, full backend packaging, documentation
  validation, Maaatch comparison, Prettier, and whitespace checks pass.

## Closed Scope

- MRG-343 owns the mobile-gateway generated reports client, public multipart relay, M2M behavior, and BFF projection.
- MRG-347 owns the Expo generated client migration; MRG-515 owns the React Hook Form/Zod report form migration.
- MRG-409 owns deeper provider security, secret-safe logging, storage lifecycle, orphan/compensation, unused surface,
  and provider-policy restructuring.
- MRG-373, MRG-374, MRG-352, and MRG-353 own remaining casing and conversion retirement after their caller gates.
- Live GitHub, Discord, S3, Auth0/M2M, standalone repository, and production changes are outside this active goal.
