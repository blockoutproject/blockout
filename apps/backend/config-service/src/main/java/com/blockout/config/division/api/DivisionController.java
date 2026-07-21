package com.blockout.config.division.api;

import com.blockout.config.division.api.mappers.DivisionApiMapper;
import com.blockout.config.division.api.models.CreateDivisionInternalRequest;
import com.blockout.config.division.api.models.DivisionInternalResponse;
import com.blockout.config.division.api.models.UpdateDivisionInternalRequest;
import com.blockout.config.division.application.DivisionService;
import com.blockout.config.division.application.views.DivisionView;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.util.List;

/**
 * Exposes the handwritten V1 Division API.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/config/divisions")
public class DivisionController {

    private final DivisionService divisionService;
    private final DivisionApiMapper mapper;
    private final ObjectMapper objectMapper;

    /**
     * Lists active and inactive divisions.
     */
    @PreAuthorize("hasAuthority('SCOPE_read:divisions')")
    @GetMapping
    public ResponseEntity<List<DivisionInternalResponse>> listAll() {
        return ResponseEntity.ok(divisionService.findAll().stream().map(mapper::toInternalResponse).toList());
    }

    /**
     * Returns one division by identifier.
     */
    @PreAuthorize("hasAuthority('SCOPE_read:divisions')")
    @GetMapping("/{id}")
    public ResponseEntity<DivisionInternalResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(mapper.toInternalResponse(divisionService.getById(id)));
    }

    /**
     * Creates a division from multipart JSON and an optional logo.
     */
    @PreAuthorize("hasAuthority('SCOPE_create:divisions')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DivisionInternalResponse> create(
        @RequestPart("data") String json,
        @RequestPart(value = "image", required = false) MultipartFile image)
        throws JsonProcessingException, IOException {
        CreateDivisionInternalRequest request = objectMapper.readValue(json, CreateDivisionInternalRequest.class);
        DivisionView created = divisionService.create(mapper.toCommand(request, image));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(mapper.toInternalResponse(created));
    }

    /**
     * Updates and, when necessary, reactivates a division.
     */
    @PreAuthorize("hasAuthority('SCOPE_update:divisions')")
    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DivisionInternalResponse> update(
        @PathVariable Long id,
        @RequestPart("data") String json,
        @RequestPart(value = "image", required = false) MultipartFile image)
        throws JsonProcessingException, IOException {
        UpdateDivisionInternalRequest request = objectMapper.readValue(json, UpdateDivisionInternalRequest.class);
        return ResponseEntity.ok(mapper.toInternalResponse(divisionService.update(id, mapper.toCommand(request, image))));
    }

    /**
     * Soft-deletes one division.
     */
    @PreAuthorize("hasAuthority('SCOPE_delete:divisions')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        divisionService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
