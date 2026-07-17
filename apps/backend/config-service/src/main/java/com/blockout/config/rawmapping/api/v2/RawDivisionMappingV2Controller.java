package com.blockout.config.rawmapping.api.v2;

import com.blockout.config.generated.api.RawDivisionMappingsApi;
import com.blockout.config.generated.model.CreateRawDivisionMappingInternalRequest;
import com.blockout.config.generated.model.RawDivisionMappingInternalListResponse;
import com.blockout.config.generated.model.RawDivisionMappingInternalResponse;
import com.blockout.config.generated.model.UpdateRawDivisionMappingInternalRequest;
import com.blockout.config.rawmapping.application.RawDivisionMappingService;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
public class RawDivisionMappingV2Controller implements RawDivisionMappingsApi {

    private final RawDivisionMappingService service;
    private final RawDivisionMappingApiMapper mapper;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_create:raw_division_mapping')")
    public ResponseEntity<RawDivisionMappingInternalResponse> createRawDivisionMapping(
            CreateRawDivisionMappingInternalRequest request) {
        RawDivisionMappingInternalResponse response = mapper.toResponse(service.create(mapper.toCommand(request)));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.getId())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:raw_division_mapping')")
    public ResponseEntity<RawDivisionMappingInternalListResponse> listRawDivisionMappings(
            String leagueCode,
            String season) {
        return ResponseEntity.ok(new RawDivisionMappingInternalListResponse(
                service.find(leagueCode, season).stream().map(mapper::toResponse).toList()));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:raw_division_mapping')")
    public ResponseEntity<RawDivisionMappingInternalResponse> getRawDivisionMapping(Long id) {
        return ResponseEntity.ok(mapper.toResponse(service.getById(id)));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:raw_division_mapping')")
    public ResponseEntity<RawDivisionMappingInternalResponse> updateRawDivisionMapping(
            Long id,
            UpdateRawDivisionMappingInternalRequest request) {
        return ResponseEntity.ok(mapper.toResponse(service.update(id, mapper.toCommand(request))));
    }
}
