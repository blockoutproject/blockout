package com.blockout.config.division.api;

import com.blockout.config.division.api.mappers.DivisionApiMapper;
import com.blockout.config.division.application.DivisionService;
import com.blockout.config.division.application.views.DivisionView;
import com.blockout.config.contract.api.DivisionApi;
import com.blockout.config.contract.model.CreateDivisionInternalRequest;
import com.blockout.config.contract.model.DivisionInternalResponse;
import com.blockout.config.contract.model.UpdateDivisionInternalRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * Implements the generated V1 Division API.
 */
@RestController
@RequiredArgsConstructor
public class DivisionController implements DivisionApi {

    private final DivisionService divisionService;
    private final DivisionApiMapper mapper;
    private final ObjectMapper objectMapper;

    /**
     * Lists active and inactive divisions.
     */
    @PreAuthorize("hasAuthority('SCOPE_read:divisions')")
    @Override
    public ResponseEntity<List<DivisionInternalResponse>> listDivisions() {
        return ResponseEntity.ok(divisionService.findAll().stream().map(mapper::toInternalResponse).toList());
    }

    /**
     * Returns one division by identifier.
     */
    @PreAuthorize("hasAuthority('SCOPE_read:divisions')")
    @Override
    public ResponseEntity<DivisionInternalResponse> getDivisionById(Long id) {
        return ResponseEntity.ok(mapper.toInternalResponse(divisionService.getById(id)));
    }

    /**
     * Creates a division from multipart JSON and an optional logo.
     */
    @PreAuthorize("hasAuthority('SCOPE_create:divisions')")
    @Override
    public ResponseEntity<DivisionInternalResponse> createDivision(String data, MultipartFile image) {
        CreateDivisionInternalRequest request = readData(data, CreateDivisionInternalRequest.class);
        DivisionView created = divisionService.create(mapper.toCommand(request, image));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(mapper.toInternalResponse(created));
    }

    /**
     * Updates and, when necessary, reactivates a division.
     */
    @PreAuthorize("hasAuthority('SCOPE_update:divisions')")
    @Override
    public ResponseEntity<DivisionInternalResponse> updateDivision(Long id, String data, MultipartFile image) {
        UpdateDivisionInternalRequest request = readData(data, UpdateDivisionInternalRequest.class);
        return ResponseEntity.ok(mapper.toInternalResponse(divisionService.update(id, mapper.toCommand(request, image))));
    }

    /**
     * Soft-deletes one division.
     */
    @PreAuthorize("hasAuthority('SCOPE_delete:divisions')")
    @Override
    public ResponseEntity<Void> deactivateDivision(Long id) {
        divisionService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    private <T> T readData(String data, Class<T> requestType) {
        try {
            return objectMapper.readValue(data, requestType);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("The multipart data field is invalid.", exception);
        }
    }
}
