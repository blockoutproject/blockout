package com.blockout.config.division.api.v1;

import com.blockout.config.division.api.DivisionLogoUploads;
import com.blockout.config.division.application.CreateDivisionCommand;
import com.blockout.config.division.application.DivisionService;
import com.blockout.config.division.application.DivisionView;
import com.blockout.config.division.application.UpdateDivisionCommand;
import com.blockout.config.shared.api.v1.LegacyConfigJson;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.net.URI;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/config/divisions", produces = MediaType.APPLICATION_JSON_VALUE)
public class LegacyDivisionController {

    private final DivisionService service;
    private final LegacyConfigJson json;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_read:divisions')")
    public ResponseEntity<String> listAll() throws JsonProcessingException {
        return ResponseEntity.ok(json.write(service.findAll().stream().map(this::response).toList()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SCOPE_read:divisions')")
    public ResponseEntity<String> getById(@PathVariable Long id) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(response(service.getById(id))));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('SCOPE_create:divisions')")
    public ResponseEntity<String> create(
            @RequestPart("data") String body,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {
        LegacyDivisionRequest request = json.read(body, LegacyDivisionRequest.class);
        DivisionView saved = service.create(new CreateDivisionCommand(
                request.name(), request.mainColor(), request.firstGradientColor(), request.secondGradientColor(),
                request.thirdGradientColor()), DivisionLogoUploads.from(image));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(saved.id()).toUri();
        return ResponseEntity.created(location).body(json.write(response(saved)));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('SCOPE_update:divisions')")
    public ResponseEntity<String> update(
            @PathVariable Long id,
            @RequestPart("data") String body,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {
        LegacyDivisionRequest request = json.read(body, LegacyDivisionRequest.class);
        DivisionView updated = service.update(id, new UpdateDivisionCommand(
                request.name(), request.mainColor(), request.firstGradientColor(), request.secondGradientColor(),
                request.thirdGradientColor()), DivisionLogoUploads.from(image));
        return ResponseEntity.ok(json.write(response(updated)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('SCOPE_delete:divisions')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    private LegacyDivisionResponse response(DivisionView view) {
        return new LegacyDivisionResponse(
                view.id(), view.name(), view.mainColor(), view.firstGradientColor(), view.secondGradientColor(),
                view.thirdGradientColor(), view.logoUrl(), view.active(), view.createdAt(), view.lastUpdate());
    }

    record LegacyDivisionRequest(
            String name,
            String mainColor,
            String firstGradientColor,
            String secondGradientColor,
            String thirdGradientColor) {
    }

    record LegacyDivisionResponse(
            Long id,
            String name,
            String mainColor,
            String firstGradientColor,
            String secondGradientColor,
            String thirdGradientColor,
            String logoUrl,
            Boolean active,
            LocalDateTime createdAt,
            LocalDateTime lastUpdate) {
    }
}
