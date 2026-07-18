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

    private static final Logger LOGGER = LoggerFactory.getLogger(ReportSubmissionApplicationService.class);

    private final ReportAttachmentStorage attachments;
    private final ReportIssueTracker issues;
    private final ReportNotifier notifier;

    /** {@inheritDoc} */
    @Override
    public ReportResult submit(ReportCommand command, List<ReportAttachment> submittedAttachments) {
        ReportSubmissionPlan plan = ReportSubmissionPlan.create(
                command, submittedAttachments, UUID.randomUUID().toString().replace("-", ""));
        LOGGER.info("Start report flow", keyValue("reportKey", plan.reportKey()));

        List<String> uploadedUrls = uploadSequentially(plan);
        ReportResult result = issues.create(plan.command());
        if (!uploadedUrls.isEmpty()) {
            issues.appendImages(result.number(), uploadedUrls);
        }

        LOGGER.info("Report created as GitHub issue",
                keyValue("action", "create_report"),
                keyValue("issueNumber", result.number()),
                keyValue("issueUrl", result.htmlUrl()),
                keyValue("reportKey", plan.reportKey()));

        try {
            notifier.notifyCreated(result);
        } catch (RuntimeException exception) {
            LOGGER.warn("Discord notification failed",
                    keyValue("action", "discord_notify"),
                    keyValue("issueNumber", result.number()),
                    keyValue("failureType", exception.getClass().getSimpleName()));
        }
        return result;
    }

    /** Uploads non-empty images in their retained one-based order. */
    private List<String> uploadSequentially(ReportSubmissionPlan plan) {
        List<String> uploadedUrls = new ArrayList<>();
        for (ReportSubmissionPlan.AttachmentUpload upload : plan.attachmentUploads()) {
            upload.validate();
            try {
                uploadedUrls.add(attachments.upload(upload));
            } catch (RuntimeException exception) {
                LOGGER.error("Image upload failed",
                        keyValue("action", "upload_report_image"),
                        keyValue("reportKey", plan.reportKey()),
                        keyValue("fileName", upload.attachment().filename()),
                        keyValue("message", exception.getMessage()), exception);
                throw new RuntimeException("Échec de l’upload de l’image");
            }
        }
        return uploadedUrls;
    }
}
