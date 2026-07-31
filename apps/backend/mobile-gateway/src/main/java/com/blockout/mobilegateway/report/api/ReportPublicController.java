package com.blockout.mobilegateway.report.api;

import com.blockout.mobilegateway.api.ReportPublicApi;
import com.blockout.mobilegateway.api.models.CreateReportRequest;
import com.blockout.mobilegateway.api.models.ReportResponse;
import com.blockout.mobilegateway.report.api.mappers.ReportApiMapper;
import com.blockout.mobilegateway.report.application.ReportApplicationService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/** Exposes report creation through the generated mobile contract. */
@RestController
@RequiredArgsConstructor
public class ReportPublicController implements ReportPublicApi {

  private final ReportApplicationService reportService;
  private final ReportApiMapper mapper;
  private final ObjectMapper objectMapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ReportResponse> createReport(String data, List<MultipartFile> images) {
    try {
      CreateReportRequest request = objectMapper.readValue(data, CreateReportRequest.class);
      return ResponseEntity.status(201)
          .body(mapper.toResponse(reportService.createReport(mapper.toCommand(request), images)));
    } catch (JacksonException exception) {
      throw new IllegalArgumentException("Invalid multipart JSON data", exception);
    }
  }
}
