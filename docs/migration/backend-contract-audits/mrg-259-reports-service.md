# MRG-259 — reports-service contract and data-boundary audit

- Audit date: 2026-07-16
- Commit: `487b52071a6d838c998df28b11d8eb181b1254f4`
- Scope roots: `apps/backend/reports-service`, the report slice of `apps/backend/mobile-gateway`, and the report API,
  types, form, and callers in `apps/frontend/mobile`
- Audited deployable or workflow: public report submission, BFF multipart relay, attachment storage, GitHub issue
  creation/update, Discord notification, and mobile report workflows
- Runtime mutation: none
- Evidence limitations: committed source and configuration only; no live S3 objects, GitHub issues/labels, Discord
  webhook deliveries, Auth0/M2M claims, production access logs, deployed mobile versions, or standalone repository
  telemetry was observed

## Scope

This audit covers the only reports-service REST operation, all four service DTOs, the report enum, multipart parsing,
the full application flow, S3 object construction, GitHub SDK calls, Discord webhook payloads, security, errors,
configuration, the copied BFF types and relay, Expo request construction, form validation, and all proven mobile report
entrypoints. Reports-service has 22 production Java files, one controller, four DTO classes, no JPA entity, no JPA
repository, no mapper package, no RabbitMQ entry, no scheduled job, and one context-load test.

The `ReportCreateDTO` and `GitHubIssueResponseDTO` names do not establish ownership. The former is a Blockout request;
the latter is manually assembled from a GitHub SDK object and then exposed as a Blockout service and BFF response. Only
the SDK objects and outbound GitHub/Discord/S3 shapes are vendor-owned. Current Springdoc, global Jackson
`SNAKE_CASE`, annotations, copied DTOs, and Expo conversions are discovery evidence rather than contract authority.

Canonical target names for Blockout-owned payloads are camelCase. GitHub, Discord, S3, configuration, and SDK naming
must remain inside explicit infrastructure adapters. All target roles remain provisional until MRG-268.

## 1. Runtime Boundary Summary

| Boundary             | Current owner / entry                | Producers                                                 | Consumers / effects                  | Auth / data owner                         | Status           |
| -------------------- | ------------------------------------ | --------------------------------------------------------- | ------------------------------------ | ----------------------------------------- | ---------------- |
| mobile report form   | Expo `ReportForm`                    | user input, session, device, app version, selected images | `ReportApi`                          | public BFF client; mobile state           | `PROVEN`         |
| BFF report REST      | POST `/api/v1/mobile/public/reports` | Expo multipart `data` + repeated `images`                 | BFF report service/client            | `permitAll`; no user identity requirement | `PROVEN`         |
| internal report REST | POST `/api/v1/reports`               | BFF multipart relay                                       | reports application flow             | JWT plus `create:reports` scope           | `PROVEN`         |
| attachment storage   | AWS SDK `PutObject`                  | validated multipart images                                | public URLs embedded in GitHub issue | static AWS credentials; S3 bucket         | `PROVEN`         |
| issue lifecycle      | GitHub Java SDK                      | derived title/body/labels, then image URLs                | Blockout response and Discord text   | GitHub token/repository                   | `PROVEN`         |
| Discord notification | webhook POST                         | derived issue number/title/URL                            | external Discord channel             | webhook URL; best effort                  | `PROVEN`         |
| persistence/events   | none                                 | none                                                      | none                                 | no database, broker, or scheduler         | `NOT_APPLICABLE` |

The BFF public security chain permits anonymous callers. With no authenticated user JWT, its generic client selects an
M2M `RestTemplate`; the internal service then requires `SCOPE_create:reports`. Whether the deployed M2M client has the
scope is `UNKNOWN` without Auth0 configuration, although production behavior implies some valid path exists.

## 2. REST Operation Inventory

Neither endpoint has an authoritative source-contract `operationId`.

| Method and path                      | Controller             | Auth rule                        | Request                                             | Success                   | Errors / caller                           | Status   |
| ------------------------------------ | ---------------------- | -------------------------------- | --------------------------------------------------- | ------------------------- | ----------------------------------------- | -------- |
| POST `/api/v1/mobile/public/reports` | BFF `createReport`     | public `permitAll`               | multipart string `data`, optional repeated `images` | 201 copied issue response | BFF error map; Expo form                  | `PROVEN` |
| POST `/api/v1/reports`               | reports `createReport` | authenticated + `create:reports` | multipart string `data`, optional repeated `images` | 201 issue response        | reports error map; BFF only proven caller | `PROVEN` |

### Operation behavior

1. Expo constructs camelCase form data, but `appendJsonSnake` deep-converts the JSON value before appending `data`.
   The multipart `images` name is already casing-neutral. React Native does not assign a proven per-part
   `application/json` media type to `data`; the BFF accepts it as a string.
2. The BFF manually parses `data` with its global snake-case `ObjectMapper`, serializes the copied DTO back to JSON,
   marks that part `application/json`, materializes every image into a `ByteArrayResource`, and sends the repeated
   `images` parts to the reports URL.
3. Reports-service parses the string manually and does not invoke Bean Validation. `@NotNull` on `type` and
   `@NotBlank` on `title` therefore do not protect the operation. Malformed JSON receives the generic 500 response;
   missing multipart parts receive 400.
4. Empty and null images are skipped. Non-empty images are processed sequentially. Declared MIME must be PNG or JPEG
   and declared size must not exceed 5 MiB, but `IllegalArgumentException` is not handled specifically and therefore
   becomes 500. The servlet also caps the entire request at 5 MiB, so several individually valid files can exceed the
   aggregate limit and return 413.
5. A 32-character UUID-derived storage key is created, images are uploaded first, a GitHub issue is created second,
   image URLs are appended to the issue third, and Discord is notified last. GitHub creation failure or a later upload
   failure leaves earlier S3 objects without compensation. A GitHub body-update failure still returns 201. Discord
   failure is also swallowed.
6. There is no pagination, ordering response, idempotency key, duplicate suppression, rate limit, attachment-count
   limit, transaction, persisted Blockout report identifier, or retry contract.

Evidence: reports controller lines 20-42; reports service lines 44-105; BFF report controller lines 16-32; BFF report
client lines 29-69; BFF security lines 21-30; `ImageUtils` lines 9-21; reports `application.yaml` lines 8-20.

## 3. Type Inventory

| Type ID       | Shape / layer                                                           | Constructed by               | Consumed by / serialized                  | Duplicate family        | Status   |
| ------------- | ----------------------------------------------------------------------- | ---------------------------- | ----------------------------------------- | ----------------------- | -------- |
| `R-API-REQ`   | reports `ReportCreateDTO`, Blockout request                             | reports `ObjectMapper`       | payload builder; inbound JSON             | report command          | `PROVEN` |
| `R-BFF-REQ`   | BFF copied `ReportCreateDTO`                                            | BFF `ObjectMapper`           | BFF serializer/client                     | report command          | `PROVEN` |
| `R-MOB-REQ`   | Expo `Report` / `Partial<Report>`                                       | report form                  | multipart helper                          | report command          | `PROVEN` |
| `R-TYPE-SVC`  | reports `ReportType` enum                                               | inbound JSON                 | label/body builder                        | report type enum        | `PROVEN` |
| `R-TYPE-BFF`  | BFF copied `ReportType` enum                                            | inbound JSON                 | downstream serialization                  | report type enum        | `PROVEN` |
| `R-TYPE-MOB`  | Expo copied `ReportType` enum                                           | form/filter                  | request payload                           | report type enum        | `PROVEN` |
| `R-API-RES`   | reports `GitHubIssueResponseDTO`, Blockout response/application carrier | GitHub client manually       | reports service, controller, BFF          | report-created response | `PROVEN` |
| `R-BFF-RES`   | BFF copied `GitHubIssueResponseDTO`                                     | downstream deserialization   | BFF response, Expo                        | report-created response | `PROVEN` |
| `R-MOB-RES`   | Expo `GitHubIssueResponse`                                              | HTTP response conversion     | form callback typing only                 | report-created response | `PROVEN` |
| `R-GH-REQ`    | reports `GitHubIssueRequestDTO`, GitHub adapter input                   | payload builder              | GitHub SDK adapter; not JSON on this path | GitHub issue request    | `PROVEN` |
| `R-GH-SDK`    | `GHIssueBuilder` / `GHIssue`, vendor SDK                                | GitHub library               | GitHub adapter only                       | none                    | `PROVEN` |
| `R-DISCORD`   | `DiscordWebhookMessageDTO`, vendor webhook JSON                         | reports service              | Discord REST call                         | none                    | `PROVEN` |
| `R-MULTIPART` | `data` string + repeated `images`                                       | Expo then BFF rebuild        | BFF and reports controllers               | multipart envelope      | `PROVEN` |
| `R-S3`        | derived S3 object/key/public URL                                        | storage client               | S3 and GitHub Markdown                    | none                    | `PROVEN` |
| `R-ERROR`     | five-field map                                                          | exception handlers           | BFF/Expo error normalization              | legacy error            | `PROVEN` |
| `R-CONFIG`    | AWS/GitHub/Discord property objects                                     | Spring configuration binding | infrastructure clients                    | none                    | `PROVEN` |

There is no API/application/domain/persistence split. Mutable Lombok DTOs cross controller, application, builder,
vendor adapter, and response boundaries. There is no mapper; handwritten builder/client assignments are the effective
mappings.

## 4. Field-Lineage Matrix

### 4.1 Blockout report request fields

All three request copies represent one current Blockout-owned JSON object. Evidence locations are reports
`ReportCreateDTO` lines 17-44, BFF `ReportCreateDTO` lines 17-44, Expo `Report.ts` lines 9-19, report form lines 90-118,
and `appendJsonSnake` lines 216-218.

| Field               | Java / TS name        | Current wire            | Target wire                       | Producer / consumers                                                                          | Validation / default                                                            | Conversion                                          | Class                     | Status   |
| ------------------- | --------------------- | ----------------------- | --------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------- | -------- |
| type                | `type`                | `type`                  | `type`                            | selected/defaulted in form; label/body builder                                                | mobile enum required; backend annotations inactive; null falls to `other` label | copied enum                                         | `REQUIRED`                | `PROVEN` |
| title               | `title`               | `title`                 | `title`                           | user; GitHub issue title                                                                      | mobile trimmed/required; backend annotation inactive                            | direct                                              | `REQUIRED`                | `PROVEN` |
| description         | `description`         | `description`           | `description`                     | user; GitHub body                                                                             | mobile required/trimmed; backend nullable                                       | direct                                              | `REQUIRED` for current UI | `PROVEN` |
| appVersion          | `appVersion`          | `app_version`           | `appVersion`                      | app constant; GitHub context                                                                  | optional                                                                        | Expo snake helper + two annotations/global naming   | `REQUIRED`                | `PROVEN` |
| userId              | `userId`              | `user_id`               | `userId`                          | screen context or session numeric ID; GitHub context                                          | optional; caller supplied, not authenticated identity                           | same casing bridge                                  | `REQUIRED`                | `PROVEN` |
| userName            | `userName`            | `user_name`             | `userName`                        | session pseudo or `Guest`; GitHub context                                                     | optional backend; form defaults `Guest`                                         | same casing bridge                                  | `REQUIRED`                | `PROVEN` |
| screen              | `screen`              | `screen`                | `screen`                          | each UI entrypoint context; GitHub context                                                    | TS required; form defaults `Unknown`; backend nullable                          | direct                                              | `REQUIRED`                | `PROVEN` |
| deviceModel         | `deviceModel`         | `device_model`          | `deviceModel`                     | Expo Device; GitHub context                                                                   | optional                                                                        | same casing bridge                                  | `REQUIRED`                | `PROVEN` |
| os                  | `os`                  | `os`                    | `os`                              | Expo Device; GitHub context                                                                   | always built by current form; backend nullable                                  | direct                                              | `REQUIRED`                | `PROVEN` |
| attachmentImageUrls | `attachmentImageUrls` | `attachment_image_urls` | `attachmentImageUrls` if retained | accepted from caller; builder embeds arbitrary URLs; service later mutates with uploaded URLs | absent from Expo `Report`; nullable/unvalidated                                 | annotations/global naming; mixed input/output state | `COMPATIBILITY_ONLY`      | `PROVEN` |

`attachmentImageUrls` is not an upload request field in the proven mobile workflow. It mixes untrusted caller input with
server-produced storage state and is read by the GitHub builder before uploaded URLs exist. It must not be copied into
the future request merely because the legacy DTO accepts it; external callers and rollback requirements must first be
resolved by MRG-267/301/304.

The five enum values are `DISPLAY_BUG`, `DATA_ERROR`, `LOGO`, `LIVE`, and `OTHER` in all three copies. They map to the
GitHub labels `display bug`, `data error`, `logo`, `live`, and `other`. Enum values are Blockout-owned; GitHub labels are
adapter configuration/behavior and must not become shared public enum values.

### 4.2 Blockout report response fields

The reports client builds this response from `GHIssue` at lines 60-72, the BFF copies it at response DTO lines 7-13,
and Expo declares it at `Report.ts` lines 21-27. Despite the legacy name, these are Blockout wire fields.

| Field   | Java / TS name | Current wire | Target wire         | Producer / consumers                                   | Conversion                                             | Class                | Status   |
| ------- | -------------- | ------------ | ------------------- | ------------------------------------------------------ | ------------------------------------------------------ | -------------------- | -------- |
| id      | `id`           | `id`         | `id` if retained    | GitHub SDK; returned through BFF; no proven UI read    | Long to TS number                                      | `COMPATIBILITY_ONLY` | `PROVEN` |
| number  | `number`       | `number`     | `number`            | GitHub SDK; body update, logs, Discord, response       | copied directly                                        | `REQUIRED`           | `PROVEN` |
| htmlUrl | `htmlUrl`      | `html_url`   | `htmlUrl`           | GitHub SDK; logs, Discord, response; no proven UI read | explicit annotations/global snake then Expo deep camel | `REQUIRED`           | `PROVEN` |
| title   | `title`        | `title`      | `title`             | GitHub SDK; Discord and response; no proven UI read    | direct                                                 | `REQUIRED`           | `PROVEN` |
| state   | `state`        | `state`      | `state` if retained | GitHub SDK enum name; response only                    | vendor enum flattened to string                        | `COMPATIBILITY_ONLY` | `PROVEN` |

Every current `ReportFormSheet` caller ignores the response value and only dismisses the sheet. A successful response
body remains deployed behavior, but field retention must be justified against external/deployed callers before the
target BFF contract is approved. The GitHub numeric ID's JavaScript safe-integer behavior is `UNKNOWN` without observed
values; a generated schema must choose its representation deliberately if the field remains.

### 4.3 Multipart fields

| Field      | Current representation                  | Target name      | Semantics / validation                                                                                      | Class          | Status   |
| ---------- | --------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- | -------------- | -------- |
| data       | stringified JSON part                   | `data`           | required; manually parsed twice; per-part media type differs Expo→BFF vs BFF→service                        | `REQUIRED`     | `PROVEN` |
| images     | repeated binary parts                   | `images`         | optional list; empty skipped; PNG/JPEG declared MIME; 5 MiB file and aggregate request constraints conflict | `REQUIRED`     | `PROVEN` |
| image URI  | React Native local `uri`                | `NOT_APPLICABLE` | mobile transport metadata only                                                                              | `VENDOR_OWNED` | `PROVEN` |
| image type | React Native `type` / HTTP Content-Type | `NOT_APPLICABLE` | trusted by server; bytes not inspected                                                                      | `VENDOR_OWNED` | `PROVEN` |
| image name | React Native `name` / filename          | `NOT_APPLICABLE` | relayed by BFF; not used in S3 key except extension fallback unreachable for accepted MIME                  | `VENDOR_OWNED` | `PROVEN` |

### 4.4 GitHub adapter fields

`GitHubIssueRequestDTO` is an internal mutable adapter input, not the reports REST request and not an observed raw
GitHub JSON response. The SDK owns provider transport.

| Field / shape | Current provider meaning | Producer / consumer                                     | Target Blockout wire | Class          | Status   |
| ------------- | ------------------------ | ------------------------------------------------------- | -------------------- | -------------- | -------- |
| title         | issue title              | copied from Blockout title; `createIssue`               | `NOT_APPLICABLE`     | `VENDOR_OWNED` | `PROVEN` |
| body          | GitHub Markdown body     | builder context/description/client URLs; SDK            | `NOT_APPLICABLE`     | `VENDOR_OWNED` | `PROVEN` |
| labels        | label names              | derived from Blockout type; SDK builder                 | `NOT_APPLICABLE`     | `VENDOR_OWNED` | `PROVEN` |
| assignees     | GitHub logins            | never populated by current builder; adapter supports it | `NOT_APPLICABLE`     | `VENDOR_OWNED` | `PROVEN` |
| milestone     | GitHub milestone number  | never populated by current builder; adapter supports it | `NOT_APPLICABLE`     | `VENDOR_OWNED` | `PROVEN` |
| SDK id        | GitHub global issue ID   | `GHIssue` mapped to Blockout response                   | `NOT_APPLICABLE`     | `VENDOR_OWNED` | `PROVEN` |
| SDK number    | repository issue number  | update lookup and response mapping                      | `NOT_APPLICABLE`     | `VENDOR_OWNED` | `PROVEN` |
| SDK html URL  | issue URL                | response/Discord mapping                                | `NOT_APPLICABLE`     | `VENDOR_OWNED` | `PROVEN` |
| SDK title     | normalized issue title   | response/Discord mapping                                | `NOT_APPLICABLE`     | `VENDOR_OWNED` | `PROVEN` |
| SDK state     | provider state enum      | flattened with `.name()`                                | `NOT_APPLICABLE`     | `VENDOR_OWNED` | `PROVEN` |

The issue body embeds report values directly in Markdown. No escaping or length limit is applied to title,
description, user name, screen, device, OS, or caller-supplied attachment URLs. Exact GitHub rejection, truncation,
mention, link, and Markdown behavior is `UNKNOWN` without safe integration fixtures.

### 4.5 S3 and Discord adapter fields

| Shape / field   | Construction                             | Provider/store meaning                         | Target Blockout wire | Class              | Status   |
| --------------- | ---------------------------------------- | ---------------------------------------------- | -------------------- | ------------------ | -------- |
| reportKey       | random UUID without hyphens              | S3 directory segment; never returned/persisted | `NOT_APPLICABLE`     | `PERSISTENCE_ONLY` | `PROVEN` |
| index           | sequential 1..n for non-empty files      | object filename                                | `NOT_APPLICABLE`     | `PERSISTENCE_ONLY` | `PROVEN` |
| extension       | declared MIME, else filename, else `bin` | object suffix                                  | `NOT_APPLICABLE`     | `PERSISTENCE_ONLY` | `PROVEN` |
| key             | `reports/{reportKey}/{index}.{ext}`      | S3 object key                                  | `NOT_APPLICABLE`     | `PERSISTENCE_ONLY` | `PROVEN` |
| bucket          | configured bucket                        | S3 destination                                 | `NOT_APPLICABLE`     | `VENDOR_OWNED`     | `PROVEN` |
| contentType     | multipart declared MIME                  | S3 object metadata                             | `NOT_APPLICABLE`     | `VENDOR_OWNED`     | `PROVEN` |
| bytes / size    | input stream and declared length         | S3 request body                                | `NOT_APPLICABLE`     | `VENDOR_OWNED`     | `PROVEN` |
| public URL      | bucket/region/key string                 | Markdown image source                          | `NOT_APPLICABLE`     | `DERIVED`          | `PROVEN` |
| Discord content | one text string                          | webhook JSON `content`                         | `NOT_APPLICABLE`     | `VENDOR_OWNED`     | `PROVEN` |

No ACL, presigned URL, retention record, lifecycle, owner record, checksum, delete-on-failure, or cleanup job exists in
the proven flow. `deleteObjectByUrl` is unused. Public accessibility and bucket lifecycle are `UNKNOWN`.

### 4.6 Error and configuration fields

The legacy error body fields are `timestamp`, `status`, `error`, `message`, and `path`, all direct Blockout wire names.
They are recreated independently in reports-service and the BFF. Expo reads `message` or `error` and replaces report
failures with one generic form message. Target Problem Details and stable codes belong to later contract tasks.

Configuration fields are not API DTOs: AWS `region`, `credentials.accessKey`, `credentials.secretKey`, `s3.bucket`;
GitHub `token`, `owner`, `repo`, `apiBaseUrl`; and Discord `webhookUrl`. Spring binds kebab-case configuration keys to
camelCase Java properties. They must remain infrastructure configuration and never enter OpenAPI.

## 5. Construction, Mapping, and Conversion Inventory

| ID      | Source → target                         | Mechanism                            | Loss / mixed behavior                           | Provisional owner                             | Status   |
| ------- | --------------------------------------- | ------------------------------------ | ----------------------------------------------- | --------------------------------------------- | -------- |
| `R-C01` | Expo form → mobile report request       | handwritten object                   | session/device/UI defaults mixed with transport | mobile application input mapper               | `PROVEN` |
| `R-C02` | camelCase request → multipart `data`    | deep `snakecaseKeys` + stringify     | implicit legacy wire casing                     | generated mobile multipart client             | `PROVEN` |
| `R-C03` | BFF multipart string → copied DTO       | manual `ObjectMapper.readValue`      | Bean Validation bypass                          | generated BFF request + API mapper            | `PROVEN` |
| `R-C04` | BFF DTO → internal multipart            | manual stringify + byte-array copies | duplicate DTO, memory amplification             | generated internal client adapter             | `PROVEN` |
| `R-C05` | reports multipart string → copied DTO   | manual `ObjectMapper.readValue`      | second validation bypass                        | generated service interface + API mapper      | `PROVEN` |
| `R-C06` | Blockout request → GitHub adapter input | handwritten builder                  | label policy and Markdown rendering mixed       | application flow + GitHub adapter mapper      | `PROVEN` |
| `R-C07` | multipart image → S3 object             | manual validation/key/SDK request    | storage lifecycle mixed in flow                 | attachment storage adapter                    | `PROVEN` |
| `R-C08` | `GHIssue` → Blockout response           | setters in GitHub client             | vendor/application/API roles share one DTO      | vendor result → application view → API mapper | `PROVEN` |
| `R-C09` | Blockout response → BFF copy            | generic RestTemplate/Jackson         | copied type and global snake casing             | generated internal client + BFF mapper        | `PROVEN` |
| `R-C10` | BFF response → Expo type                | global deep `camelcaseKeys`          | implicit response transform                     | generated mobile client                       | `PROVEN` |
| `R-C11` | GitHub result → Discord JSON            | string concatenation + webhook DTO   | notification wording in orchestration           | Discord adapter command                       | `PROVEN` |

Mapper inventory: `NONE`. `GitHubIssuePayloadBuilder` and client setters perform mapping but are not explicit
boundary mappers. `DiffUtils` is unused copied code and does not participate in this service flow.

## 6. Duplicate-Type Analysis

| Family          | Members                              | Difference / consumer                                          | Provisional disposition                                                   | Status   |
| --------------- | ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------- | -------- |
| report request  | reports DTO, BFF DTO, Expo `Report`  | Expo omits `attachmentImageUrls`; backend copies are identical | generated internal/BFF requests plus mobile view input                    | `PROVEN` |
| report type     | reports, BFF, Expo enums             | identical values; GitHub labels differ                         | shared contract enum, adapter-local label mapping                         | `PROVEN` |
| report response | reports DTO, BFF DTO, Expo interface | identical fields; only Java annotations bridge `html_url`      | boundary-local generated responses/mappers; reduce only with caller proof | `PROVEN` |
| error map       | reports and BFF handlers             | same fields, different generic English/French messages         | shared Problem Details primitive and BFF normalization                    | `PROVEN` |

Object DTOs should remain boundary-local even when structurally similar. The three report enums are a candidate for one
shared contract enum. Vendor payloads must not be promoted into shared Blockout schemas.

## 7. Persistence and External Side-Effect Boundary

There is no relational persistence. GitHub is the durable report record and S3 holds untracked attachments. The service
returns a provider-derived issue projection and stores no mapping from Blockout user/context, reportKey, S3 keys, or
issue number. This prevents repository-backed idempotency, cleanup, reconciliation, retention, ownership checks, and
report lookup.

The operation's side effects are not atomic:

1. each S3 upload commits independently;
2. GitHub issue creation commits independently;
3. GitHub body append is best effort and hides failure;
4. Discord is best effort and hides failure.

Whether this is the approved product consistency model is `UNKNOWN`; MRG-268/409 must preserve current visible success
semantics until a separately authorized behavior decision changes them.

## 8. Validation, Error, Security, and Compatibility Behavior

| Boundary              | Current rule / failure                                                          | Caller expectation / gap                                            | Status                     |
| --------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------- |
| BFF access            | anonymous public route                                                          | anyone can submit reports; abuse/rate policy absent                 | `PROVEN`                   |
| internal access       | JWT and `create:reports`                                                        | BFF M2M scope required but tenant evidence unavailable              | `PROVEN` / `UNKNOWN` scope |
| request DTO           | annotations present but no `@Valid` path                                        | null/blank fields can reach GitHub                                  | `PROVEN`                   |
| malformed JSON        | manual parser exception → generic 500                                           | should be captured as current parity before later 400 normalization | `PROVEN`                   |
| image MIME/size       | PNG/JPEG and 5 MiB manual checks                                                | `IllegalArgumentException` → 500; bytes unverified                  | `PROVEN`                   |
| multipart size        | file and whole request both 5 MiB                                               | multi-image aggregate can return 413                                | `PROVEN`                   |
| S3 failure            | runtime 500                                                                     | prior uploads can remain                                            | `PROVEN`                   |
| GitHub create failure | runtime 500                                                                     | uploaded objects can remain                                         | `PROVEN`                   |
| GitHub body append    | warning then 201                                                                | issue can omit uploaded images                                      | `PROVEN`                   |
| Discord failure       | warning then 201                                                                | notification is explicitly non-blocking                             | `PROVEN`                   |
| casing                | global snake strategy + 12 explicit copied annotations + mobile deep transforms | three implicit conversion boundaries                                | `PROVEN`                   |
| error body            | ad hoc five-field maps, no stable code                                          | mobile displays generic failure                                     | `PROVEN`                   |

The reports `RestTemplate` interceptor attaches the currently authenticated Blockout bearer token to every outbound
request. Discord uses that same `RestTemplate`, so the service sends its inbound BFF/M2M access token to the third-party
webhook whenever the security context is a JWT. This is a proven boundary leak from `RestTemplateConfig` lines 23-33
and `DiscordClientService` lines 38-45. The Discord client also logs the full webhook URL at INFO and on failures; the
URL contains the webhook credential. Both issues require a focused security fix in the owning later slice without
changing MRG-259's read-only scope.

## 9. BFF, Expo, TanStack, and Orval Call Graph

| Step | Call / conversion                                         | Cardinality / auth                      | Failure / UI behavior                            | Status   |
| ---- | --------------------------------------------------------- | --------------------------------------- | ------------------------------------------------ | -------- |
| 1    | report form builds context/device payload and JPEG images | one form submission; no bearer          | Formik/Yup blocks missing type/title/description | `PROVEN` |
| 2    | `ReportApi` POST `/public/reports`                        | one multipart; public client            | normalized error then generic toast              | `PROVEN` |
| 3    | BFF parses and rebuilds multipart                         | one downstream call; M2M when anonymous | 4xx status preserved; 5xx generic                | `PROVEN` |
| 4    | reports uploads N non-empty images                        | sequential N S3 calls                   | fail-fast, no compensation                       | `PROVEN` |
| 5    | reports creates one issue, optionally updates it once     | one create + zero/one update            | create blocking; update best effort              | `PROVEN` |
| 6    | reports posts zero/one Discord message                    | best effort                             | failure hidden from client                       | `PROVEN` |
| 7    | Expo receives response                                    | all current callbacks ignore fields     | sheet dismisses on success                       | `PROVEN` |

The report flow currently uses an imperative mobile-local API call rather than TanStack Query state. TanStack remains
owned by the single Expo application and must not become a shared library. After MRG-313 selects Orval, generated
multipart transport and schemas should also remain mobile-local; an Orval mutation hook may integrate with the existing
mobile query client, while image selection/compression, Formik/Yup, haptics, context derivation, toast copy, and sheet
state remain handwritten mobile concerns. This audit does not select or configure a generator.

## 10. Test and Parity Evidence

| Area            | Existing evidence            | Missing parity evidence for migration                                            | Status   |
| --------------- | ---------------------------- | -------------------------------------------------------------------------------- | -------- |
| reports service | one `contextLoads` test      | controller auth/multipart, field casing, validation, errors, workflow            | `PROVEN` |
| BFF             | source only for report slice | anonymous→M2M relay, per-part headers, byte copies, error translation            | `PROVEN` |
| mobile          | source only                  | real React Native multipart, response casing, all entry contexts, retry/error UX | `PROVEN` |
| S3              | source only                  | MIME bytes, aggregate size, partial uploads, public URL, cleanup/lifecycle       | `PROVEN` |
| GitHub          | source only                  | labels, Markdown, null title, rate limits, create/update partial failure         | `PROVEN` |
| Discord         | source only                  | token/header isolation, secret-safe logging, disabled webhook, provider failures | `PROVEN` |
| contracts       | Springdoc annotations only   | authoritative operation, generated clients, deterministic camelCase schemas      | `PROVEN` |

No tests were added because MRG-259 is a read-only audit. Later parity must capture current user-visible success and
failure behavior before removing DTOs, annotations, case transforms, or handwritten clients.

## 11. Findings and Provisional Target Roles

| ID           | Finding / behavioral risk                                                                                  | Follow-up                             | Status                          |
| ------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| `REPORT-F01` | Blockout request/response DTOs are named and layered as GitHub shapes, leaking vendor ownership            | MRG-268/324/409                       | `PROVEN`                        |
| `REPORT-F02` | no mapper separates API, application flow, S3, GitHub, Discord, or BFF roles                               | MRG-268/409/414                       | `PROVEN`                        |
| `REPORT-F03` | Bean Validation annotations are bypassed by manual multipart JSON parsing                                  | MRG-324/340/409                       | `PROVEN`                        |
| `REPORT-F04` | malformed JSON and invalid image metadata become 500, while aggregate size becomes 413                     | contract/error parity                 | `PROVEN`                        |
| `REPORT-F05` | public anonymous BFF submission depends on an undocumented M2M scope and has no abuse control              | security/contract decision            | `PROVEN` / `UNKNOWN` deployment |
| `REPORT-F06` | caller-controlled `attachmentImageUrls` mixes request data with server storage output                      | MRG-267/268/324                       | `PROVEN`                        |
| `REPORT-F07` | S3 uploads can orphan on upload/GitHub failures; no retention/reconciliation record exists                 | MRG-268/409                           | `PROVEN`                        |
| `REPORT-F08` | GitHub image append failure still returns success with an incomplete issue                                 | parity/consistency decision           | `PROVEN`                        |
| `REPORT-F09` | inbound Blockout JWT is forwarded to Discord by the shared outbound interceptor                            | security fix in MRG-409               | `PROVEN`                        |
| `REPORT-F10` | full Discord webhook credential is logged                                                                  | logging/security fix                  | `PROVEN`                        |
| `REPORT-F11` | GitHub Markdown accepts unescaped and unbounded user/context values                                        | adapter validation decision           | `PROVEN`                        |
| `REPORT-F12` | global snake casing, 12 copied annotations, multipart helper, and deep response conversion hide ownership  | MRG-303/304/351-354                   | `PROVEN`                        |
| `REPORT-F13` | all current Expo callers ignore five response fields                                                       | MRG-267 plus external caller evidence | `PROVEN`                        |
| `REPORT-F14` | only a context smoke test protects a multi-provider side-effect workflow                                   | MRG-355/419/421                       | `PROVEN`                        |
| `REPORT-F15` | unused `DiffUtils`, delete-by-URL, assignee, milestone, WebP/GIF/fallback paths broaden accidental surface | MRG-267/409/417                       | `PROVEN`                        |

| Current type / behavior | Provisional target role                                      | Keep / split / map / retire        | Preconditions / owner                         |
| ----------------------- | ------------------------------------------------------------ | ---------------------------------- | --------------------------------------------- |
| report request          | generated Blockout internal request + application command    | split/map                          | MRG-268/324; external caller inventory        |
| report enum             | shared generated Blockout enum                               | keep once                          | MRG-267/305/324                               |
| attachment images       | generated multipart boundary + application attachment inputs | split/map                          | generator multipart proof and parity fixtures |
| attachmentImageUrls     | server-owned application/storage result, not client command  | remove from request if proven safe | MRG-267/304 compatibility proof               |
| GitHub request/result   | infrastructure adapter command/result                        | contain/map                        | MRG-268/409                                   |
| Blockout response       | generated internal/BFF report-created response               | rename/reduce only with proof      | caller inventory and product decision         |
| S3 key/object           | attachment storage adapter model                             | contain                            | retention/compensation decision               |
| Discord message         | vendor adapter payload                                       | contain                            | isolated client and secret-safe logging       |
| BFF copies              | generated reports client mapped to BFF response              | retire/map                         | MRG-340/413/414                               |
| Expo transport          | mobile-local Orval client/schema and optional mutation       | replace handwritten transport only | MRG-313/328/347/503                           |
| mobile form state       | handwritten Expo view/form model                             | keep mobile-local                  | no product behavior change                    |

## 12. Unknowns and Completion

| Unknown                                                              | Required evidence                                          | Blocking later work     |
| -------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------- |
| deployed anonymous/M2M scope and rate behavior                       | Auth0 client configuration and gateway/service access logs | auth contract/cutover   |
| external consumers and response-field reads                          | access logs, standalone/deployed client inventory          | response reduction      |
| live GitHub labels, permissions, limits, and issue template behavior | safe integration fixture and repository configuration      | adapter migration       |
| live S3 public policy, lifecycle, orphans, and retention             | safe bucket inventory and ownership decision               | storage migration       |
| Discord delivery/header acceptance and secret exposure history       | rotated safe test webhook and log inventory                | security remediation    |
| React Native multipart headers and aggregate image behavior          | device-level fixture on Android/iOS                        | generated client parity |
| desired idempotency, abuse control, and partial-success semantics    | product/security/architecture decision                     | MRG-268/304/409         |
| whether any report response body is product-visible                  | external caller matrix and UX decision                     | target BFF contract     |

- [x] Both REST boundaries, auth paths, multipart parts, downstream providers, and all monorepo callers are inventoried.
- [x] Every report, response, GitHub, Discord, multipart, S3, error, and configuration field has an ownership and lineage
      classification.
- [x] Current snake_case and target camelCase names are explicit for every Blockout-owned field.
- [x] GitHub SDK, Discord webhook, S3, and configuration shapes are separated from Blockout API contracts.
- [x] Manual construction, missing mapper boundaries, copied DTOs/enums, and inactive validation are explicit.
- [x] BFF relay, anonymous/M2M auth, Expo form/case conversions, response consumers, TanStack ownership, and future
      mobile-local Orval integration are explicit.
- [x] Side-effect ordering, partial failures, token/vendor boundary leaks, secret logging, and storage unknowns are
      recorded without changing behavior.
- [x] Existing tests, missing parity fixtures, provisional roles, and downstream task owners are explicit.
- [x] No runtime, contract, generated artifact, schema, migration, test, configuration, or deployment file changed.

MRG-263/264 must consolidate BFF auth, multipart relay, error, and report projection evidence. MRG-267/268 must approve
field retention, report/application/vendor roles, response shape, storage consistency, and security boundaries.
MRG-301/303/304/324 must define the authoritative camelCase contracts and compatibility rollout. MRG-340/347/409/413/
414 must migrate generated clients, Expo transport, Java boundaries, and vendor adapters with behavioral parity.
MRG-351-354 must remove Blockout-only naming annotations and case conversions only after every caller is cut over.
TanStack and Orval remain Expo-owned. Production deployment did not occur.
