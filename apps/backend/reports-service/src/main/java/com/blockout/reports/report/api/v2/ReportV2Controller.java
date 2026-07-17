package com.blockout.reports.report.api.v2;

import com.blockout.reports.generated.api.ReportsApi;
import com.blockout.reports.generated.model.CreateReportInternalRequest;
import com.blockout.reports.generated.model.ReportCreatedInternalResponse;
import com.blockout.reports.report.api.ReportAttachments;
import com.blockout.reports.report.application.ReportSubmissionService;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Implements the canonical generated report-submission boundary. */
@RestController
@RequiredArgsConstructor
public class ReportV2Controller implements ReportsApi {

    private final ReportSubmissionService reports;
    private final ReportApiMapper mapper;

    /** {@inheritDoc} */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_create:reports')")
    public ResponseEntity<ReportCreatedInternalResponse> createReport(
            CreateReportInternalRequest data,
            List<MultipartFile> images) {
        try {
            return ResponseEntity.status(201)
                    .body(mapper.toResponse(reports.submit(mapper.toCommand(data), ReportAttachments.from(images))));
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to read report attachment.", exception);
        }
    }
}
