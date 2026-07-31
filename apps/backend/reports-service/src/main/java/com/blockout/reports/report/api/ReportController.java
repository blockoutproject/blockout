package com.blockout.reports.report.api;

import com.blockout.reports.report.api.mappers.ReportApiMapper;
import com.blockout.reports.report.api.models.CreateReportInternalRequest;
import com.blockout.reports.report.api.models.ReportInternalResponse;
import com.blockout.reports.report.application.ReportApplicationService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/** Implements the generated V1 internal Report API. */
@RestController
@RequiredArgsConstructor
public class ReportController implements ReportApi {

  private final ReportApplicationService reportService;
  private final ReportApiMapper mapper;
  private final ObjectMapper objectMapper;

  @Override
  @PreAuthorize("hasAuthority('SCOPE_create:reports')")
  public ResponseEntity<ReportInternalResponse> createReport(
      String data, List<MultipartFile> images) {
    CreateReportInternalRequest request = readData(data);
    return ResponseEntity.status(201)
        .body(mapper.toResponse(reportService.createReport(mapper.toCommand(request, images))));
  }

  private CreateReportInternalRequest readData(String data) {
    try {
      return objectMapper.readValue(data, CreateReportInternalRequest.class);
    } catch (JacksonException exception) {
      throw new IllegalArgumentException("The multipart data field is invalid.", exception);
    }
  }
}
