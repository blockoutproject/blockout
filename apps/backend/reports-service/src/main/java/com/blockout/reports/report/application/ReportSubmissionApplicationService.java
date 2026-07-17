package com.blockout.reports.report.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Preserves the deployed report side-effect sequence behind explicit ports. */
@Service
@RequiredArgsConstructor
public class ReportSubmissionApplicationService implements ReportSubmissionService {

    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private static final Logger LOGGER = LoggerFactory.getLogger(ReportSubmissionApplicationService.class);

    private final ReportAttachmentStorage attachments;
    private final ReportIssueTracker issues;
    private final ReportNotifier notifier;

    /** {@inheritDoc} */
    @Override
    public ReportResult submit(ReportCommand command, List<ReportAttachment> submittedAttachments) {
        String reportKey = UUID.randomUUID().toString().replace("-", "");
        LOGGER.info("Start report flow", keyValue("reportKey", reportKey));

        List<String> uploadedUrls = uploadSequentially(submittedAttachments, reportKey);
        ReportResult result = issues.create(command);
        if (!uploadedUrls.isEmpty()) {
            issues.appendImages(result.number(), uploadedUrls);
        }

        LOGGER.info("Report created as GitHub issue",
                keyValue("action", "create_report"),
                keyValue("issueNumber", result.number()),
                keyValue("issueUrl", result.htmlUrl()),
                keyValue("reportKey", reportKey));

        try {
            notifier.notifyCreated(result);
        } catch (RuntimeException exception) {
            LOGGER.warn("Discord notification failed",
                    keyValue("action", "discord_notify"),
                    keyValue("issueNumber", result.number()),
                    keyValue("message", exception.getMessage()));
        }
        return result;
    }

    /** Uploads non-empty images in their retained one-based order. */
    private List<String> uploadSequentially(List<ReportAttachment> submittedAttachments, String reportKey) {
        List<String> uploadedUrls = new ArrayList<>();
        if (submittedAttachments == null) {
            return uploadedUrls;
        }
        int index = 1;
        for (ReportAttachment attachment : submittedAttachments) {
            if (attachment == null || attachment.size() == 0) {
                continue;
            }
            validate(attachment);
            try {
                uploadedUrls.add(attachments.upload(attachment, reportKey, index++));
            } catch (RuntimeException exception) {
                LOGGER.error("Image upload failed",
                        keyValue("action", "upload_report_image"),
                        keyValue("reportKey", reportKey),
                        keyValue("fileName", attachment.filename()),
                        keyValue("message", exception.getMessage()), exception);
                throw new RuntimeException("Échec de l’upload de l’image");
            }
        }
        return uploadedUrls;
    }

    /** Preserves the declared PNG/JPEG and five-megabyte checks. */
    private void validate(ReportAttachment attachment) {
        if (!"image/png".equals(attachment.contentType()) && !"image/jpeg".equals(attachment.contentType())) {
            throw new IllegalArgumentException("Seuls les formats PNG et JPEG sont autorisés.");
        }
        if (attachment.size() > MAX_IMAGE_SIZE) {
            throw new IllegalArgumentException("La taille maximale de l’image est de 5 Mo.");
        }
    }
}
