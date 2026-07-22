package com.blockout.mobilegateway.config.api;

import com.blockout.mobilegateway.config.api.mappers.ConfigApiMapper;
import com.blockout.mobilegateway.api.ConfigSecureApi;
import com.blockout.mobilegateway.api.models.AppStatusResponse;
import com.blockout.mobilegateway.api.models.CreateRawDivisionMappingRequest;
import com.blockout.mobilegateway.api.models.DivisionResponse;
import com.blockout.mobilegateway.api.models.LegalDocumentResponse;
import com.blockout.mobilegateway.api.models.RawDivisionMappingResponse;
import com.blockout.mobilegateway.api.models.ScraperStatusResponse;
import com.blockout.mobilegateway.api.models.UpdateAppStatusRequest;
import com.blockout.mobilegateway.api.models.UpdateLegalDocumentRequest;
import com.blockout.mobilegateway.api.models.UpdateRawDivisionMappingRequest;
import com.blockout.mobilegateway.api.models.UpsertDivisionRequest;
import com.blockout.mobilegateway.config.application.ConfigApplicationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/** Exposes secured configuration operations through the generated mobile contract. */
@RestController
@RequiredArgsConstructor
public class ConfigSecureController implements ConfigSecureApi {

    private final ConfigApplicationService configService;
    private final ConfigApiMapper mapper;
    private final ObjectMapper objectMapper;

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<AppStatusResponse> updateAppStatus(UpdateAppStatusRequest request) {
        return ResponseEntity.ok(mapper.toResponse(
            configService.updateAppStatus(mapper.toCommand(request))));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<DivisionResponse> createDivision(String data, MultipartFile image) {
        UpsertDivisionRequest request = read(data, UpsertDivisionRequest.class);
        DivisionResponse created = mapper.toResponse(
            configService.createDivision(mapper.toCommand(request), image));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created.getId())
            .toUri();
        return ResponseEntity.created(location).body(created);
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<DivisionResponse> updateDivision(Long id, String data, MultipartFile image) {
        UpsertDivisionRequest request = read(data, UpsertDivisionRequest.class);
        return ResponseEntity.ok(mapper.toResponse(
            configService.updateDivision(id, mapper.toCommand(request), image)));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Void> deactivateDivision(Long id) {
        configService.deactivateDivision(id);
        return ResponseEntity.noContent().build();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<RawDivisionMappingResponse> createRawDivisionMapping(
            CreateRawDivisionMappingRequest request) {
        RawDivisionMappingResponse created = mapper.toResponse(
            configService.createRawDivisionMapping(mapper.toCommand(request)));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created.getId())
            .toUri();
        return ResponseEntity.created(location).body(created);
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<LegalDocumentResponse> updateLegalDocument(
            String type, UpdateLegalDocumentRequest request) {
        return ResponseEntity.ok(mapper.toResponse(
            configService.updateLegalDocument(type, mapper.toCommand(request))));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<List<RawDivisionMappingResponse>> listRawDivisions(String leagueCode, String season) {
        return ResponseEntity.ok(configService.listRawDivisionMappings(leagueCode, season).stream()
            .map(mapper::toResponse)
            .toList());
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<RawDivisionMappingResponse> getRawDivisionById(Long id) {
        return ResponseEntity.ok(mapper.toResponse(configService.getRawDivisionMappingById(id)));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<RawDivisionMappingResponse> updateRawDivision(
            Long id, UpdateRawDivisionMappingRequest request) {
        return ResponseEntity.ok(mapper.toResponse(
            configService.updateRawDivisionMapping(id, mapper.toCommand(request))));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<ScraperStatusResponse> updateScraperStatus(String name, Boolean enabled) {
        return ResponseEntity.ok(mapper.toResponse(configService.updateScraperStatus(name, enabled)));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<List<ScraperStatusResponse>> listScraperStatuses() {
        return ResponseEntity.ok(configService.listScraperStatuses().stream().map(mapper::toResponse).toList());
    }

    private <T> T read(String data, Class<T> type) {
        try {
            return objectMapper.readValue(data, type);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Invalid multipart JSON data", exception);
        }
    }
}
