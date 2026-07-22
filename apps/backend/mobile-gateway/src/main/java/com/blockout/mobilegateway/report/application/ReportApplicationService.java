package com.blockout.mobilegateway.report.application;

import com.blockout.mobilegateway.report.application.commands.CreateReportCommand;
import com.blockout.mobilegateway.report.application.views.ReportView;
import com.blockout.mobilegateway.report.infrastructure.ReportInternalClient;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ReportApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(ReportApplicationService.class);
    private final ReportInternalClient reportInternalClient;

    public ReportView createReport(CreateReportCommand command, List<MultipartFile> images) {
        long t0 = System.nanoTime();
        int count = images != null ? images.size() : 0;
        logger.info("Create report request",
            keyValue("action", "create_report"),
            keyValue("type", command != null ? command.type() : null),
            keyValue("has_description", command != null && command.description() != null),
            keyValue("images_count", count));

        try {
            ReportView res = reportInternalClient.createReport(command, images);
            long t1 = System.nanoTime();
            logger.info("Report created",
                keyValue("action", "create_report_done"),
                keyValue("issue_number", res != null ? res.number() : null),
                keyValue("images_count", count),
                keyValue("duration_ms", (t1 - t0) / 1_000_000));
            return res;
        } catch (RuntimeException e) {
            long t1 = System.nanoTime();
            logger.error("Report creation failed",
                keyValue("action", "create_report_failed"),
                keyValue("images_count", count),
                keyValue("duration_ms", (t1 - t0) / 1_000_000),
                e);
            throw e;
        }
    }
}
