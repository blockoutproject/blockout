package com.blockout.config.rawdivisionmapping.api;

import com.blockout.config.rawdivisionmapping.api.mappers.RawDivisionMappingApiMapper;
import com.blockout.config.rawdivisionmapping.api.models.CreateRawDivisionMappingInternalRequest;
import com.blockout.config.rawdivisionmapping.api.models.RawDivisionMappingInternalResponse;
import com.blockout.config.rawdivisionmapping.api.models.UpdateRawDivisionMappingInternalRequest;
import com.blockout.config.rawdivisionmapping.application.RawDivisionMappingService;
import com.blockout.config.rawdivisionmapping.application.views.RawDivisionMappingView;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * Exposes the handwritten V1 RawDivisionMapping API.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/config/raw-divisions")
public class RawDivisionMappingController {

    private final RawDivisionMappingService service;
    private final RawDivisionMappingApiMapper mapper;

    /**
     * Creates a raw provider-to-Blockout division mapping.
     */
    @PreAuthorize("hasAuthority('SCOPE_create:raw_division_mapping')")
    @PostMapping
    public ResponseEntity<RawDivisionMappingInternalResponse> create(
        @RequestBody CreateRawDivisionMappingInternalRequest request) {
        RawDivisionMappingView created = service.create(mapper.toCommand(request));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(mapper.toInternalResponse(created));
    }

    /**
     * Lists mappings with optional native camelCase filters.
     */
    @PreAuthorize("hasAuthority('SCOPE_read:raw_division_mapping')")
    @GetMapping
    public ResponseEntity<List<RawDivisionMappingInternalResponse>> list(
        @RequestParam(required = false) String leagueCode,
        @RequestParam(required = false) String season) {
        return ResponseEntity.ok(service.findByLeagueCodeAndSeason(leagueCode, season).stream()
            .map(mapper::toInternalResponse).toList());
    }

    /**
     * Returns one mapping by identifier.
     */
    @PreAuthorize("hasAuthority('SCOPE_read:raw_division_mapping')")
    @GetMapping("/{id}")
    public ResponseEntity<RawDivisionMappingInternalResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(mapper.toInternalResponse(service.getById(id)));
    }

    /**
     * Updates the Blockout classification of one provider mapping.
     */
    @PreAuthorize("hasAuthority('SCOPE_update:raw_division_mapping')")
    @PutMapping("/{id}")
    public ResponseEntity<RawDivisionMappingInternalResponse> update(
        @PathVariable Long id,
        @RequestBody UpdateRawDivisionMappingInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(service.update(id, mapper.toCommand(request))));
    }
}
