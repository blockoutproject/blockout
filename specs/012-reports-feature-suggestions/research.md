# Research: Private support and suggestions

## Complete receipt without mobile recovery

**Decision:** One bounded submission, complete confirmation or ordinary form error with explicit retry. GitHub is the only durable case and attachment store. No receipt endpoint, database ticket, outbox, automatic resend or persistent mobile submission pointer.

**Rationale:** The accepted scope permits rare duplicate private issues to be closed manually. A response lost after provider success does not establish failure; an error makes the retained form editable without claiming cancellation. A known issue can be checked once during its current backend attempt, but the application does not search for past submissions.

**Alternatives considered:** A receipt registry or recovery lookup would add storage, lifecycle and reconciliation solely to eliminate an explicitly accepted exceptional duplicate. A queue would change synchronous complete acceptance. Neither is retained.

## Native GitHub issues and attachments

**Decision:** Use the official REST API for issue creation/labels and GitHub CLI **2.102.0** for native attachments. With images, create an incomplete private issue, attach every image, then change its labels to complete. Without images, create it complete directly. An opaque request UUID in the case identifies the accepted submission without exposing its private URL to the mobile.

**Rationale:** [GitHub documents `--attach`](https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli) for issue creation, editing and comments. The [selected release](https://github.com/cli/cli/releases/tag/v2.102.0) supports this path without copying its internal upload protocol into Java. [REST issue operations](https://docs.github.com/en/rest/issues/issues) and [labels](https://docs.github.com/en/rest/issues/labels) provide the ordinary case workflow. The backend owns its issue body and preserves its content when adding attachment references.

**Limits of evidence:** The [upload implementation](https://github.com/cli/cli/blob/v2.102.0/internal/attachments/attach.go) stops at the first failed upload and cannot undo previous uploads. [Issue editing](https://github.com/cli/cli/blob/v2.102.0/pkg/cmd/issue/edit/edit.go) can persist successful attachment references and still return an error. A nonzero exit does not mean no effects. Only successful completion of all attachments and the final complete marking permits success; a final ambiguous marking may be checked through the known issue once, without replaying uploads.

The [attachment client](https://github.com/cli/cli/blob/v2.102.0/internal/attachments/client.go) accepts fine-grained personal access tokens and requires repository write access. GitHub App installation tokens are not supported by that path. Use a server token restricted to the dedicated private repository; qualify the real minimum permissions and upload behavior before activation. No repository, token, label or provider setting is created by this planning delivery.

**Alternatives considered:** Undocumented direct Java upload calls would duplicate provider internals. Separate object storage would introduce another privacy, retention and association boundary. The official CLI in the backend image adds a binary dependency but avoids both mechanisms; no extra service is needed.

## Confidentiality, closure and exceptional erasure

**Decision:** Normal processing is an email reply followed by issue closure, without deletion or periodic purge. No independent Blockout backup of support cases or images. Manual privacy requests use the existing F11 procedure.

**Rationale:** [GitHub's attachment documentation](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files) limits private-repository attachments to people with repository access and accepts PNG/JPEG within a 10 MB provider image bound; the application keeps its stricter 5 MiB bound. Repository permissions, not mobile administrative rights, control handling. PostgreSQL backups contain no support cases or image bytes.

**Limits of evidence:** Documentation is not a test of the actual repository permissions. Verify authorized and unauthenticated access before use. Issue closure, removal of a Markdown link and deletion of an issue do not prove attachment erasure. The applicable provider erasure procedure remains a pre-use qualification for exceptional privacy requests; it is not an automated product workflow. Recovery depends on GitHub capabilities. [Repository backup documentation](https://docs.github.com/en/repositories/archiving-a-github-repository/backing-up-a-repository) does not turn a Git mirror into a complete restorable support archive.

## Independent operator signal

**Decision:** Send a generic private Discord message with a link to the request list after complete receipt, using Spring HTTP and `wait=true` on the [official webhook](https://docs.discord.com/developers/resources/webhook#execute-webhook).

**Rationale:** Discord can return the created message rather than merely accepting an unconfirmed handoff. Alert failure never invalidates a complete support case. Exclude all user fields, filenames and attachment content. No raw GitHub webhook forwarding or recovery worker.

## Form, images and multipart boundary

**Decision:** Reuse React Hook Form/Zod, TanStack Query and the shared image control. Use SDK-compatible [Expo ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/) and [ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/) with no forced crop. One bounded preparation preserves proportions and produces PNG/JPEG; a still-too-large or failed image must be corrected or removed explicitly.

**Rationale:** Ordinary picker/manipulator operations provide the needed preparation without a custom editor or iterative compression loop. The current form owns text and temporary image references; account/session changes discard them and reject old responses. A request without images remains valid.

Use [Spring MVC multipart binding](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/multipart-forms.html) for a JSON `@RequestPart` and repeated image parts, Bean Validation and actual image decoding before provider calls. [Spring Boot multipart properties](https://docs.spring.io/spring-boot/appendix/application-properties/index.html) provide file/request limits and temporary storage. Use 5 MiB per file and 26 MiB per request, leaving space for the bounded metadata and normal multipart overhead; defaults are insufficient. Native cleanup and a `finally` cleanup of CLI temporary files replace a separate storage lifecycle. [ProcessBuilder](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ProcessBuilder.html) uses separate arguments, a fixed server repository and environment credentials, never shell interpolation. Native [ImageReader](https://docs.oracle.com/en/java/javase/25/docs/api/java.desktop/javax/imageio/ImageReader.html) can inspect dimensions before decoding; the existing bounded image-validation approach needs no new image service.

[Spring Security authorization](https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html) and [resource-server bearer authentication](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/bearer-tokens.html) retain their ordinary roles. The mobile omits credentials and credential renewal for ordinary support sends; the backend permits public access but still rejects an invalid supplied token. Explicit maintenance bypass uses the existing authenticated F12 admission path. A separate public security chain is unnecessary.

The contract bounds titles to 200 characters, descriptions to 10,000, reply addresses to 254 and contextual free-text fields to 256. These are application input limits, not claims about GitHub maxima. They keep ordinary reports usable and leave room for context and attachment references in the provider body. Reject oversize input before provider calls, without truncation, splitting or a visible counter. Qualify the composed issue at these limits, including Unicode and all five attachment references; do not infer provider acceptance from schema validity.

**Alternatives considered:** Square profile-photo cropping changes the meaning of a support screenshot. Silent image omission breaks complete acceptance. Neither is reused merely because another feature uses photos.

**Qualification limits:** OpenAPI multipart array generation, Java/TypeScript compilation, native image preparation, real provider sending, private attachment access and erasure are not established by this research. The [quickstart](quickstart.md) describes these checks. No generated-output patch, template fork or custom multipart encoder is selected as a fallback.
