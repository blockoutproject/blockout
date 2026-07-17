package com.blockout.reports.report.api.v1;

import com.blockout.reports.report.api.ReportAttachments;
import com.blockout.reports.report.application.ReportCommand;
import com.blockout.reports.report.application.ReportResult;
import com.blockout.reports.report.application.ReportSubmissionService;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Adapts the retained v1 multipart contract to the canonical report use case. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reports")
public class LegacyReportController {

    private final ReportSubmissionService reports;
    private final LegacyReportsJson json;

    /** Preserves the exact v1 request, status, response fields, and error behavior. */
    @PreAuthorize("hasAuthority('SCOPE_create:reports')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> createReport(
            @RequestPart("data") String data,
            @RequestPart(value = "images", required = false) List<MultipartFile> images)
            throws JsonProcessingException, IOException {
        LegacyReportRequest request = json.read(data);
        ReportResult result = reports.submit(toCommand(request), ReportAttachments.from(images));
        LegacyReportResponse response = new LegacyReportResponse(
                result.legacyProviderId(), result.number(), result.htmlUrl().toString(), result.title(),
                result.legacyProviderState());
        return ResponseEntity.status(201).body(json.write(response));
    }

    /** Keeps compatibility-only caller fields out of the canonical transport mapper. */
    private ReportCommand toCommand(LegacyReportRequest request) {
        return new ReportCommand(
                request.type(),
                request.title(),
                request.description(),
                request.appVersion(),
                null,
                request.userId(),
                request.userName(),
                request.screen(),
                request.deviceModel(),
                request.os(),
                request.attachmentImageUrls());
    }
}
