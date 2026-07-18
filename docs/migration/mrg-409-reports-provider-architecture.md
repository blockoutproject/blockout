# MRG-409 Reports Provider Architecture

- Status: implemented in the monorepo shadow baseline
- Runtime owner: `reports-service`
- Scope: report submission planning, attachment storage, GitHub issue creation, and Discord notification adapters
- Production effect: none

## Purpose

MRG-409 completes the approved Phase MRG-400 restructuring of `reports-service` after MRG-340 established the
generated Blockout API and proved the deployed multi-provider sequence. It gives application code immutable,
provider-neutral submission and attachment types while keeping GitHub, Discord, AWS SDK, and HTTP details inside
their owning infrastructure adapters.

This is a structural and security-correction slice. It does not add a transaction, retry, compensation, cleanup,
retention, reconciliation, abuse policy, Markdown policy, or provider migration. The MRG-259 audit's unresolved
storage and partial-success questions remain explicit unknowns rather than inferred product behavior.

## Ownership

| Concern                          | Application owner                                  | Adapter owner                                          |
| -------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| Submission and attachment order  | immutable `ReportSubmissionPlan`                   | none                                                   |
| Report orchestration             | `ReportSubmissionApplicationService`               | none                                                   |
| Attachment validation intent     | `ReportSubmissionPlan.AttachmentUpload`            | none                                                   |
| Attachment persistence           | `ReportAttachmentStorage`                          | `S3ReportAttachmentStorage`                            |
| Issue creation and image append  | `ReportIssueTracker` and provider-neutral records  | `GitHubIssueAdapter` and `GitHubIssuePayloadBuilder`   |
| GitHub SDK construction          | none                                               | `GitHubClientConfiguration`                            |
| Best-effort notification         | `ReportNotifier` and `ReportNotificationException` | `DiscordReportNotifier` and `DiscordHttpConfiguration` |
| Legacy and generated REST routes | existing report application contract               | isolated v1 and generated v2 controllers               |

`ReportSubmissionPlan` owns the generated 32-character report key and the immutable, one-based ordered attachment
work. Neither the application service nor its ports expose AWS requests, GitHub SDK issue objects, Discord payloads,
HTTP responses, or vendor exceptions. `GitHubIssueDraft` now contains only the title, body, and labels that the
application actually supplies; unused assignee and milestone surface has been removed.

## Retained Side-Effect Sequence

The unchanged submission order is:

1. generate a 32-character report key and build the ordered attachment plan;
2. skip null and empty attachments;
3. validate each remaining attachment immediately before its upload;
4. upload it to `reports/{reportKey}/{one-based-index}.{png|jpg}`;
5. create the GitHub issue;
6. best-effort append uploaded image URLs to the issue body;
7. best-effort send the Discord notification;
8. return the provider-neutral report result.

The attachment plan deliberately does not preflight every image. If the first image is valid and the second is
invalid, the first upload still occurs before validation fails. Upload or GitHub-create failure can therefore leave
earlier S3 objects. GitHub image-append failure can still yield a successful but incomplete issue, and Discord
failure remains hidden after issue creation. No deletion, compensation, retry, idempotency key, recovery record, or
retention timer is introduced.

The S3 adapter now accepts only validated `AttachmentUpload` work and maps the two reachable MIME types to the
retained `png` and `jpg` suffixes. Unreachable WebP, GIF, original-filename, and binary fallback branches were removed.
Bucket, region, static credentials, synchronous AWS client, content type, public URL shape, and object visibility are
unchanged.

## Provider Isolation And Secret-Safe Logging

Discord now owns a dedicated `RestTemplate` with no inbound Blockout authorization interceptor. An authenticated
caller token can no longer be forwarded to the configured webhook. The adapter also no longer logs the webhook URL,
provider response body, or exception message. Logs retain only the operation, HTTP status when available, and stable
failure type; `ReportNotificationException` exposes a fixed application-safe message while preserving the cause for
internal diagnosis.

GitHub SDK construction moved beside the GitHub adapter. Application contracts continue to expose only report
commands, results, issue drafts, and uploaded URL strings. The GitHub repository, credential source, labels, Markdown
body, synchronous SDK calls, create-before-append behavior, and hidden append failure remain unchanged.

The previously unused generic `DiffUtils`, shared outbound `RestTemplateConfig`, and root-level `GitHubConfig` were
removed. No replacement abstraction was added for behavior that has no proven caller.

## Compatibility And Closed Scope

The generated v2 contract, legacy v1 compatibility fields approved by MRG-304, multipart handling, routes, scopes,
status/error behavior, report key and S3 key shapes, GitHub issue content, Discord message, provider credentials,
environment values, and callers remain compatible. There is no schema migration, data rewrite, object move, bucket
operation, repository operation, webhook operation, credential rotation, deployment, or production authority.

MRG-409 does not settle report retention, orphan cleanup, compensation, Markdown escaping or bounds, public endpoint
abuse controls, synchronous-provider policy, GitHub image-append failure semantics, or Discord delivery guarantees.
Those require separately approved product and operational evidence. Production v1 retirement, live traffic changes,
cutover, deployment, and every MRG-9xx/MRG-1000 action remain outside this active goal.

## Verification And Rollback

Focused tests cover the provider-neutral architecture, immutable ordered plan, null and empty filtering, sequential
validation and its retained orphan window, S3 coordinates through the application port, GitHub payload ownership,
dedicated Discord HTTP isolation, secret-safe Discord logs, and best-effort notification behavior. Validation commands:

```text
mvn -f apps/backend/pom.xml -pl reports-service -am -Dtest='!ReportsApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only `reports-service` image revert. Existing objects, GitHub issues, webhook configuration,
credentials, generated contracts, routes, callers, environment values, deployment, and production authority remain
compatible with the previous image.
