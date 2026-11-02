# Data model: Private support

F10 adds no PostgreSQL table or migration. GitHub owns durable cases and native image attachments; mobile/backend state below lasts only for the current form or send.

| Concept         | Values and owner                                                                                                                       | Lifecycle and invariant                                                                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Form draft      | Mobile: problem/suggestion, optional subject, title, description, editable reply email, safe available context and selected images.    | Survives ordinary errors within the current journey. No restoration after restart. Account/session change discards it. Contact/context declarations establish no identity or entitlement.                           |
| Image selection | Mobile: up to five local image references, preparation state and preview.                                                              | Correct or remove every failed selection explicitly. Prepared PNG/JPEG, at most 5 MiB each; proportions preserved. The shared control owns selection/preview/replacement/removal, not a support-specific editor.    |
| Send snapshot   | Backend: immutable validated metadata, owned private temporary file paths and generated opaque request UUID.                           | Validate fields, count, real format, size and decoding before external effects. Temporary bytes are private and cleaned after processing. No receipt registry, persisted command or restoration lookup.             |
| GitHub case     | Dedicated private support repository: title/body, reply contact, useful context, request UUID, native attachments and ordinary labels. | A case with images starts incomplete and becomes complete only after all attachments succeed. An incomplete attempt is never handled as a completed request. Cases without images can be created complete directly. |
| Operator signal | Discord: generic message and private request-list link.                                                                                | Attempted after complete acceptance. Contains no submitted content; failure does not change acceptance. No independent resend state.                                                                                |

## State and effects

The mobile moves from editable draft to sending, then either complete confirmation or ordinary error with the draft retained. A retry is a new send, not an update of the previous case. Disabling submission while sending prevents ordinary double taps; it does not promise exactly one GitHub issue across lost responses.

The send orchestrator keeps the private issue reference as a local value during the current request, separate from the immutable validated snapshot. Content-detected MIME remains local to validation and filename selection; only the owned paths are retained after validation. A bounded read of that same issue can confirm an ambiguous final complete marking; it never searches by submitted text or reattaches files to guess an older result. A process interruption loses this transient context. Partial uploads and a complete issue with a lost HTTP response may remain in GitHub. Operators close incomplete attempts or rare duplicates manually.

GitHub labels distinguish incomplete and complete intake from the ordinary open/closed handling lifecycle. A failed secondary signal does not change those labels or reopen the form. No SQL transaction spans GitHub or Discord calls.

## Privacy and ownership

Repository permissions govern all case and attachment access. Mobile administration is unrelated. Images use generated temporary filenames, not user-controlled paths or shell arguments. Case content is never copied to public artifacts, diagnostics, Discord or PostgreSQL backups.

Issue closure is ordinary workflow, not erasure. [F11](../004-advertising-privacy-legal/spec.md#rights-and-information) owns exceptional rights handling. Removing a reference, deleting a business account or closing an issue is not proof of deleting the provider's image bytes. No periodic support purge or independent backup is added; recovery depends on GitHub capabilities.
