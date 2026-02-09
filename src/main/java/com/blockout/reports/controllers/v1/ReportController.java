package com.blockout.reports.controllers.v1;

import com.blockout.reports.models.dto.github.GitHubIssueResponseDTO;
import com.blockout.reports.models.dto.report.ReportCreateDTO;
import com.blockout.reports.services.ReportService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reports")
public class ReportController {

    private final ReportService reportService;
    private final ObjectMapper objectMapper;

    @Operation(summary = "Créer un report", description = "Crée une issue GitHub à partir d’un JSON et d’images optionnelles (multipart).")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Issue créée")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_create:reports')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GitHubIssueResponseDTO> createReport(
            @RequestPart("data") String json,
            @RequestPart(value = "images", required = false) List<MultipartFile> images)
            throws JsonProcessingException {

        ReportCreateDTO dto = objectMapper.readValue(json, ReportCreateDTO.class);
        GitHubIssueResponseDTO created = reportService.createReport(dto, images);
        return ResponseEntity.status(201).body(created);
    }
}