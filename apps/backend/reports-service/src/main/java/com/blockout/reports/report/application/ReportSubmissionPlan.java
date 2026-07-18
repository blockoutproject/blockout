package com.blockout.reports.report.application;

import java.util.ArrayList;
import java.util.List;

/** Captures one report submission and its ordered attachment storage work. */
public record ReportSubmissionPlan(
        ReportCommand command,
        String reportKey,
        List<AttachmentUpload> attachmentUploads) {

    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;

    /** Defensively owns the ordered storage work. */
    public ReportSubmissionPlan {
        attachmentUploads = List.copyOf(attachmentUploads);
    }

    /** Builds the retained one-based upload plan before any external effect occurs. */
    public static ReportSubmissionPlan create(
            ReportCommand command,
            List<ReportAttachment> submittedAttachments,
            String reportKey) {
        List<AttachmentUpload> uploads = new ArrayList<>();
        if (submittedAttachments == null) {
            return new ReportSubmissionPlan(command, reportKey, uploads);
        }

        int index = 1;
        for (ReportAttachment attachment : submittedAttachments) {
            if (attachment == null || attachment.size() == 0) {
                continue;
            }
            uploads.add(new AttachmentUpload(reportKey, index++, attachment));
        }
        return new ReportSubmissionPlan(command, reportKey, uploads);
    }

    /** Identifies one attachment and its storage coordinates. */
    public record AttachmentUpload(String reportKey, int index, ReportAttachment attachment) {

        /** Preserves validation immediately before this upload rather than preflighting later attachments. */
        public void validate() {
            if (!"image/png".equals(attachment.contentType()) && !"image/jpeg".equals(attachment.contentType())) {
                throw new IllegalArgumentException("Seuls les formats PNG et JPEG sont autorisés.");
            }
            if (attachment.size() > MAX_IMAGE_SIZE) {
                throw new IllegalArgumentException("La taille maximale de l’image est de 5 Mo.");
            }
        }
    }
}
