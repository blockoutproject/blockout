package com.blockout.config.division.api.v2;

import com.blockout.config.division.api.DivisionLogoUploads;
import com.blockout.config.division.application.DivisionService;
import com.blockout.config.generated.api.DivisionsApi;
import com.blockout.config.generated.model.CreateDivisionInternalRequest;
import com.blockout.config.generated.model.DivisionInternalListResponse;
import com.blockout.config.generated.model.DivisionInternalResponse;
import com.blockout.config.generated.model.UpdateDivisionInternalRequest;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
public class DivisionV2Controller implements DivisionsApi {

    private final DivisionService service;
    private final DivisionApiMapper mapper;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:divisions')")
    public ResponseEntity<DivisionInternalListResponse> listDivisions() {
        return ResponseEntity.ok(new DivisionInternalListResponse(
                service.findAll().stream().map(mapper::toResponse).toList()));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:divisions')")
    public ResponseEntity<DivisionInternalResponse> getDivision(Long id) {
        return ResponseEntity.ok(mapper.toResponse(service.getById(id)));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_create:divisions')")
    public ResponseEntity<DivisionInternalResponse> createDivision(
            CreateDivisionInternalRequest data,
            MultipartFile image) {
        DivisionInternalResponse response = mapper.toResponse(
                service.create(mapper.toCommand(data), DivisionLogoUploads.from(image)));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.getId())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:divisions')")
    public ResponseEntity<DivisionInternalResponse> updateDivision(
            Long id,
            UpdateDivisionInternalRequest data,
            MultipartFile image) {
        return ResponseEntity.ok(mapper.toResponse(
                service.update(id, mapper.toCommand(data), DivisionLogoUploads.from(image))));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_delete:divisions')")
    public ResponseEntity<Void> deactivateDivision(Long id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
