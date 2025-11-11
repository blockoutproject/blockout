package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.report.GitHubIssueResponseDTO;
import com.blockout.mobilegateway.models.dto.report.ReportCreateDTO;
import com.blockout.mobilegateway.services.clients.ReportClientService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ReportService {

    private static final Logger logger = LoggerFactory.getLogger(ReportService.class);
    private final ReportClientService reportClientService;

    public GitHubIssueResponseDTO createReport(ReportCreateDTO dto, List<MultipartFile> images) {
        long t0 = System.nanoTime();
        int count = images != null ? images.size() : 0;
        logger.info("Create report request",
                keyValue("action", "create_report"),
                keyValue("type", dto != null ? dto.getType() : null),
                keyValue("has_description", dto != null && dto.getDescription() != null),
                keyValue("images_count", count));

        try {
            GitHubIssueResponseDTO res = reportClientService.createReport(dto, images);
            long t1 = System.nanoTime();
            logger.info("Report created",
                    keyValue("action", "create_report_done"),
                    keyValue("issue_number", res != null ? res.getNumber() : null),
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