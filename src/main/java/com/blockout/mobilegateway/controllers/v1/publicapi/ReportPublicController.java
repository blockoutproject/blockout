package com.blockout.mobilegateway.controllers.v1.publicapi;

import com.blockout.mobilegateway.models.dto.report.GitHubIssueResponseDTO;
import com.blockout.mobilegateway.models.dto.report.ReportCreateDTO;
import com.blockout.mobilegateway.services.ReportService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public/reports")
public class ReportPublicController {

    private final ReportService reportService;
    private final ObjectMapper objectMapper;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GitHubIssueResponseDTO> createReport(
            @RequestPart("data") String json,
            @RequestPart(value = "images", required = false) List<MultipartFile> images) throws JsonProcessingException {
        
        System.out.println("----------------------");
        ReportCreateDTO dto = objectMapper.readValue(json, ReportCreateDTO.class);
        GitHubIssueResponseDTO created = reportService.createReport(dto, images);
        return ResponseEntity.status(201).body(created);
    }
}