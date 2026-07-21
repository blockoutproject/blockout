package com.blockout.mobilegateway.report.api;

import com.blockout.mobilegateway.report.api.models.CreateReportRequest;
import com.blockout.mobilegateway.report.api.models.ReportResponse;
import com.blockout.mobilegateway.report.application.ReportApplicationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public/reports")
public class ReportPublicController {

    private final ReportApplicationService reportService;
    private final ObjectMapper objectMapper;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReportResponse> createReport(
        @RequestPart("data") String json,
        @RequestPart(value = "images", required = false) List<MultipartFile> images) throws JsonProcessingException {

        CreateReportRequest dto = objectMapper.readValue(json, CreateReportRequest.class);
        ReportResponse created = reportService.createReport(dto, images);
        return ResponseEntity.status(201).body(created);
    }
}
