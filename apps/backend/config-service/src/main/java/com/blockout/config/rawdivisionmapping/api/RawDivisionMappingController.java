package com.blockout.config.rawdivisionmapping.api;

import com.blockout.config.rawdivisionmapping.api.mappers.RawDivisionMappingApiMapper;
import com.blockout.config.rawdivisionmapping.application.RawDivisionMappingService;
import com.blockout.config.rawdivisionmapping.application.views.RawDivisionMappingView;
import com.blockout.config.contract.api.RawDivisionMappingApi;
import com.blockout.config.contract.model.CreateRawDivisionMappingInternalRequest;
import com.blockout.config.contract.model.RawDivisionMappingInternalResponse;
import com.blockout.config.contract.model.UpdateRawDivisionMappingInternalRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * Implements the generated V1 RawDivisionMapping API.
 */
@RestController
@RequiredArgsConstructor
public class RawDivisionMappingController implements RawDivisionMappingApi {

    private final RawDivisionMappingService service;
    private final RawDivisionMappingApiMapper mapper;

    /**
     * Creates a raw provider-to-Blockout division mapping.
     */
    @PreAuthorize("hasAuthority('SCOPE_create:raw_division_mapping')")
    @Override
    public ResponseEntity<RawDivisionMappingInternalResponse> createRawDivisionMapping(
        CreateRawDivisionMappingInternalRequest request) {
        RawDivisionMappingView created = service.create(mapper.toCommand(request));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(mapper.toInternalResponse(created));
    }

    /**
     * Lists mappings with optional native camelCase filters.
     */
    @PreAuthorize("hasAuthority('SCOPE_read:raw_division_mapping')")
    @Override
    public ResponseEntity<List<RawDivisionMappingInternalResponse>> listRawDivisionMappings(
        String leagueCode, String season) {
        return ResponseEntity.ok(service.findByLeagueCodeAndSeason(leagueCode, season).stream()
            .map(mapper::toInternalResponse).toList());
    }

    /**
     * Returns one mapping by identifier.
     */
    @PreAuthorize("hasAuthority('SCOPE_read:raw_division_mapping')")
    @Override
    public ResponseEntity<RawDivisionMappingInternalResponse> getRawDivisionMappingById(Long id) {
        return ResponseEntity.ok(mapper.toInternalResponse(service.getById(id)));
    }

    /**
     * Updates the Blockout classification of one provider mapping.
     */
    @PreAuthorize("hasAuthority('SCOPE_update:raw_division_mapping')")
    @Override
    public ResponseEntity<RawDivisionMappingInternalResponse> updateRawDivisionMapping(
        Long id, UpdateRawDivisionMappingInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(service.update(id, mapper.toCommand(request))));
    }
}
