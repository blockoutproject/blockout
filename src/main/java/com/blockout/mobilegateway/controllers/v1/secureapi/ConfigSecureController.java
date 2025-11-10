package com.blockout.mobilegateway.controllers.v1.secureapi;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionUpdateDTO;
import com.blockout.mobilegateway.models.dto.config.LegalDocumentDTO;
import com.blockout.mobilegateway.models.dto.config.LegalDocumentUpdateDTO;
import com.blockout.mobilegateway.models.dto.config.RawDivisionMappingDTO;
import com.blockout.mobilegateway.models.dto.config.RawDivisionMappingUpdateDTO;
import com.blockout.mobilegateway.models.dto.config.ScraperStatusDTO;
import com.blockout.mobilegateway.services.ConfigService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;

import java.net.URI;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/secure/config")
public class ConfigSecureController {

    private final ConfigService configService;
    private final ObjectMapper objectMapper;

    @PostMapping(path = "/divisions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DivisionDTO> createDivision(
            @RequestPart("data") String json,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        DivisionUpdateDTO dto = objectMapper.readValue(json, DivisionUpdateDTO.class);
        DivisionDTO created = configService.createDivision(dto, image);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping(path = "/divisions/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DivisionDTO> updateDivision(
            @PathVariable Long id,
            @RequestPart("data") DivisionUpdateDTO dto,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        //DivisionUpdateDTO dto = objectMapper.readValue(json, DivisionUpdateDTO.class);
        DivisionDTO updated = configService.updateDivision(id, dto, image);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/divisions/{id}")
    public ResponseEntity<Void> deactivateDivision(@PathVariable Long id) {
        configService.deactivateDivision(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/raw-divisions")
    public ResponseEntity<RawDivisionMappingDTO> createRawDivisionMapping(@RequestBody RawDivisionMappingDTO dto) {
        RawDivisionMappingDTO created = configService.createRawDivisionMapping(dto);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/legal/{type}")
    public ResponseEntity<LegalDocumentDTO> updateLegal(
            @PathVariable String type,
            @RequestBody LegalDocumentUpdateDTO dto) {

        LegalDocumentDTO updated = configService.updateLegalDocument(type, dto);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/raw-divisions")
    public ResponseEntity<List<RawDivisionMappingDTO>> listRawDivisions(
            @RequestParam(required = false, name = "league_code") String leagueCode,
            @RequestParam(required = false) String season) {
        List<RawDivisionMappingDTO> list = configService.listRawDivisionMappings(leagueCode, season);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/raw-divisions/{id}")
    public ResponseEntity<RawDivisionMappingDTO> getRawDivisionById(@PathVariable Long id) {
        RawDivisionMappingDTO dto = configService.getRawDivisionMappingById(id);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/raw-divisions/{id}")
    public ResponseEntity<RawDivisionMappingDTO> updateRawDivision(
            @PathVariable Long id,
            @RequestBody RawDivisionMappingUpdateDTO dto) {
        RawDivisionMappingDTO updated = configService.updateRawDivisionMapping(id, dto);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/scrapers/{name}/enabled")
    public ResponseEntity<ScraperStatusDTO> updateScraperStatus(
            @PathVariable String name,
            @RequestParam boolean enabled) {
        ScraperStatusDTO updated = configService.updateScraperStatus(name, enabled);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/scrapers/status")
    public ResponseEntity<List<ScraperStatusDTO>> listScraperStatuses() {
        List<ScraperStatusDTO> list = configService.listScraperStatuses();
        return ResponseEntity.ok(list);
    }
}