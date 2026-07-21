package com.blockout.mobilegateway.config.api;

import com.blockout.mobilegateway.config.api.models.*;
import com.blockout.mobilegateway.config.application.ConfigApplicationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/secure/config")
public class ConfigSecureController {

    private final ConfigApplicationService configService;
    private final ObjectMapper objectMapper;

    @PutMapping("/app-status")
    public ResponseEntity<AppStatusResponse> updateAppStatus(@RequestBody UpdateAppStatusRequest dto) {
        AppStatusResponse updated = configService.updateAppStatus(dto);
        return ResponseEntity.ok(updated);
    }

    @PostMapping(path = "/divisions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DivisionResponse> createDivision(
        @RequestPart("data") String json,
        @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        UpsertDivisionRequest dto = objectMapper.readValue(json, UpsertDivisionRequest.class);
        DivisionResponse created = configService.createDivision(dto, image);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created.getId())
            .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping(path = "/divisions/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DivisionResponse> updateDivision(
        @PathVariable Long id,
        @RequestPart("data") String json,
        @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        UpsertDivisionRequest dto = objectMapper.readValue(json, UpsertDivisionRequest.class);
        DivisionResponse updated = configService.updateDivision(id, dto, image);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/divisions/{id}")
    public ResponseEntity<Void> deactivateDivision(@PathVariable Long id) {
        configService.deactivateDivision(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/raw-divisions")
    public ResponseEntity<RawDivisionMappingResponse> createRawDivisionMapping(@RequestBody RawDivisionMappingResponse dto) {
        RawDivisionMappingResponse created = configService.createRawDivisionMapping(dto);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created.getId())
            .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/legal/{type}")
    public ResponseEntity<LegalDocumentResponse> updateLegal(
        @PathVariable String type,
        @RequestBody UpdateLegalDocumentRequest dto) {

        LegalDocumentResponse updated = configService.updateLegalDocument(type, dto);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/raw-divisions")
    public ResponseEntity<List<RawDivisionMappingResponse>> listRawDivisions(
        @RequestParam(required = false, name = "leagueCode") String leagueCode,
        @RequestParam(required = false) String season) {
        List<RawDivisionMappingResponse> list = configService.listRawDivisionMappings(leagueCode, season);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/raw-divisions/{id}")
    public ResponseEntity<RawDivisionMappingResponse> getRawDivisionById(@PathVariable Long id) {
        RawDivisionMappingResponse dto = configService.getRawDivisionMappingById(id);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/raw-divisions/{id}")
    public ResponseEntity<RawDivisionMappingResponse> updateRawDivision(
        @PathVariable Long id,
        @RequestBody UpdateRawDivisionMappingRequest dto) {
        RawDivisionMappingResponse updated = configService.updateRawDivisionMapping(id, dto);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/scrapers/{name}/enabled")
    public ResponseEntity<ScraperStatusResponse> updateScraperStatus(
        @PathVariable String name,
        @RequestParam boolean enabled) {
        ScraperStatusResponse updated = configService.updateScraperStatus(name, enabled);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/scrapers/status")
    public ResponseEntity<List<ScraperStatusResponse>> listScraperStatuses() {
        List<ScraperStatusResponse> list = configService.listScraperStatuses();
        return ResponseEntity.ok(list);
    }
}
