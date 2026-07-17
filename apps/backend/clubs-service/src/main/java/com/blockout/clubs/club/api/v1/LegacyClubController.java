package com.blockout.clubs.club.api.v1;

import com.blockout.clubs.club.api.ClubLogoUploads;
import com.blockout.clubs.club.application.ClubLogoChange;
import com.blockout.clubs.club.application.ClubService;
import com.blockout.clubs.club.application.ClubView;
import com.blockout.clubs.club.application.CreateClubCommand;
import com.blockout.clubs.club.application.UpdateClubCommand;
import com.blockout.clubs.shared.api.v1.LegacyClubsJson;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/clubs", produces = MediaType.APPLICATION_JSON_VALUE)
public class LegacyClubController {

    private final ClubService service;
    private final LegacyClubsJson json;

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_read:clubs')")
    public ResponseEntity<String> listClubs(
            @RequestParam(required = false) List<String> ids,
            @RequestParam(required = false) Boolean active) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(service.findLegacy(ids, active).stream().map(this::response).toList()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SCOPE_read:clubs')")
    public ResponseEntity<String> getClubById(@PathVariable String id) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(response(service.getById(id))));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('SCOPE_create:clubs')")
    public ResponseEntity<String> createClub(
            @RequestPart("data") String body,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {
        LegacyClubRequest request = json.read(body, LegacyClubRequest.class);
        ClubView saved = service.create(new CreateClubCommand(
                request.id(), request.rawName(), request.name(), request.city(), request.postalCode(), request.email(),
                request.phoneNumber(), request.website()), ClubLogoUploads.from(image));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(saved.id())
                .toUri();
        return ResponseEntity.created(location).body(json.write(response(saved)));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('SCOPE_update:clubs')")
    public ResponseEntity<String> updateClub(
            @PathVariable String id,
            @RequestPart("data") String body,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {
        LegacyClubRequest request = json.read(body, LegacyClubRequest.class);
        ClubLogoChange logoChange = LegacyClubLogoChanges.from(request.logoUrl(), image);
        ClubView updated = service.update(id, new UpdateClubCommand(
                request.rawName(), request.name(), request.address(), request.city(), request.postalCode(),
                request.email(), request.phoneNumber(), request.website()), logoChange);
        return ResponseEntity.ok(json.write(response(updated)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('SCOPE_delete:clubs')")
    public ResponseEntity<Void> deactivateClub(@PathVariable String id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/{id}/logo", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getClubLogo(@PathVariable String id) {
        ClubView club = service.getById(id);
        if (club.logoUrl() == null || club.logoUrl().isBlank()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(club.logoUrl());
    }

    private LegacyClubResponse response(ClubView view) {
        return new LegacyClubResponse(
                view.id(), view.rawName(), view.name(), view.address(), view.city(), view.postalCode(), view.email(),
                view.phoneNumber(), view.website(), view.logoUrl(), view.active(), view.latitude(), view.longitude(),
                view.createdAt(), view.lastUpdate());
    }

    record LegacyClubRequest(
            String id,
            String rawName,
            String name,
            String address,
            String city,
            String postalCode,
            String email,
            String phoneNumber,
            String website,
            String logoUrl) {
    }

    record LegacyClubResponse(
            String id,
            String rawName,
            String name,
            String address,
            String city,
            String postalCode,
            String email,
            String phoneNumber,
            String website,
            String logoUrl,
            Boolean active,
            Double latitude,
            Double longitude,
            LocalDateTime createdAt,
            LocalDateTime lastUpdate) {
    }
}
