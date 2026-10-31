package com.blockout.backend.support.application;

/**
 * Private case content; ordinary intake labels are mapped by the provider adapter.
 *
 * @param title canonical submitted title, unchanged
 * @param body complete content and declared context, without truncation
 * @param complete initial intake state, true only when no attachments are required
 */
public record SupportCaseDraft(String title, String body, boolean complete) {
  /**
   * Composes all known declarations without fetching account or hidden target details.
   *
   * @param submission validated immutable current attempt
   * @return private draft containing the opaque UUID and every known canonical field
   */
  public static SupportCaseDraft from(SupportSubmission submission) {
    SupportSubmission.Metadata metadata = submission.metadata();
    StringBuilder body = new StringBuilder();
    body.append("Request: ").append(submission.requestId()).append('\n');
    field(body, "kind", metadata.kind().getValue());
    if (metadata.subject() != null) field(body, "subject", metadata.subject().getValue());
    field(body, "replyEmail", metadata.replyEmail());
    body.append("\n## Description\n\n")
        .append(metadata.description())
        .append("\n\n## Declared context\n\n");
    SupportSubmission.Context context = metadata.context();
    field(body, "screen", context.screen());
    field(body, "action", context.action());
    field(body, "accountId", context.accountId());
    field(body, "appVersion", context.appVersion());
    if (context.platform() != null) field(body, "platform", context.platform().getValue());
    field(body, "osVersion", context.osVersion());
    field(body, "deviceModel", context.deviceModel());
    if (context.target() != null) {
      field(body, "target.type", context.target().type().getValue());
      field(body, "target.id", context.target().id());
    }
    if (context.signInFailure() != null) {
      field(body, "signInFailure.method", context.signInFailure().method());
      field(body, "signInFailure.stage", context.signInFailure().stage());
      field(body, "signInFailure.reason", context.signInFailure().reason());
      field(body, "signInFailure.reference", context.signInFailure().reference());
    }
    return new SupportCaseDraft(metadata.title(), body.toString(), submission.images().isEmpty());
  }

  /**
   * Appends a known field; unknown facts remain absent rather than invented or rendered as null.
   *
   * @param body current private case composition
   * @param name fixed technical field name
   * @param value known canonical declaration, or null when unknown
   */
  private static void field(StringBuilder body, String name, Object value) {
    if (value != null) body.append(name).append(": ").append(value).append('\n');
  }
}
