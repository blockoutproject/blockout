package com.blockout.reports.report.application;

import com.blockout.reports.report.application.commands.CreateReportCommand;
import com.blockout.reports.report.application.models.ReportAttachment;
import com.blockout.reports.report.application.ports.IssueProvider;
import com.blockout.reports.report.application.ports.ReportImageStorage;
import com.blockout.reports.report.application.ports.ReportNotifier;
import com.blockout.reports.report.application.views.ReportView;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/**
 * Orchestrates report issue creation, attachment storage, and best-effort notification.
 */
@Service
@RequiredArgsConstructor
public class ReportApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(ReportApplicationService.class);

    private final IssueProvider issueProvider;
    private final ReportNotifier notifier;
    private final ReportImageStorage imageStorage;

    private final IssueDraftFactory issueDraftFactory = new IssueDraftFactory();

    /**
     * Creates a report and notifies the configured channel when possible.
     *
     * @param command validated report input.
     * @return created issue details.
     */
    public ReportView createReport(CreateReportCommand command) {
        String reportKey = UUID.randomUUID().toString().replace("-", "");
        logger.info("Start report flow", keyValue("reportKey", reportKey));

        List<String> uploadedUrls = new ArrayList<>();
        if (command.attachments() != null) {
            int index = 1;
            for (ReportAttachment image : command.attachments()) {
                if (image == null || image.isEmpty())
                    continue;
                validateImage(image);
                try {
                    String url = imageStorage.upload(image, reportKey, index++);
                    uploadedUrls.add(url);
                } catch (Exception e) {
                    logger.error("Image upload failed",
                        keyValue("action", "upload_report_image"),
                        keyValue("reportKey", reportKey),
                        e);
                    throw new RuntimeException("Échec de l’upload de l’image");
                }
            }
        }

        ReportView response = issueProvider.create(issueDraftFactory.create(command));
        int issueNumber = response.number();

        if (!uploadedUrls.isEmpty()) {
            issueProvider.appendImages(issueNumber, uploadedUrls);
        }

        logger.info("Report created",
            keyValue("action", "create_report"),
            keyValue("issueNumber", issueNumber),
            keyValue("reportKey", reportKey));

        try {
            notifier.notifyCreated(response);
        } catch (Exception e) {
            logger.warn("Discord notification failed",
                keyValue("action", "discord_notify"),
                keyValue("issueNumber", issueNumber), e);
        }

        return response;
    }

    /**
     * Enforces the accepted image types and maximum attachment size.
     *
     * @param image attachment to validate.
     * @throws IllegalArgumentException when the attachment cannot be accepted.
     */
    private void validateImage(ReportAttachment image) {
        if (!"image/png".equals(image.contentType()) && !"image/jpeg".equals(image.contentType())) {
            throw new IllegalArgumentException("Seuls les formats PNG et JPEG sont autorisés.");
        }
        if (image.content().length > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("La taille maximale de l’image est de 5 Mo.");
        }
    }
}
