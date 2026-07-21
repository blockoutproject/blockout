package com.blockout.reports.report.api;

import com.blockout.reports.report.api.mappers.ReportApiMapper;
import com.blockout.reports.report.api.models.CreateReportInternalRequest;
import com.blockout.reports.report.api.models.ReportInternalResponse;
import com.blockout.reports.report.application.ReportApplicationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reports")
public class ReportController {

    private final ReportApplicationService reportService;
    private final ReportApiMapper mapper;
    private final ObjectMapper objectMapper;

    @Operation(summary = "Créer un report", description = "Crée une issue GitHub à partir d’un JSON et d’images optionnelles (multipart).")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Issue créée")
    })
    @PreAuthorize("hasAuthority('SCOPE_create:reports')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReportInternalResponse> createReport(
        @RequestPart("data") String json,
        @RequestPart(value = "images", required = false) List<MultipartFile> images)
        throws JsonProcessingException {

        CreateReportInternalRequest request = objectMapper.readValue(json, CreateReportInternalRequest.class);
        return ResponseEntity.status(201).body(mapper.toResponse(reportService.createReport(mapper.toCommand(request, images))));
    }
}
