package com.blockout.clubs.club.api;

import com.blockout.clubs.club.api.mappers.ClubApiMapper;
import com.blockout.clubs.club.api.models.ClubInternalResponse;
import com.blockout.clubs.club.api.models.CreateClubInternalRequest;
import com.blockout.clubs.club.api.models.UpdateClubInternalRequest;
import com.blockout.clubs.club.application.ClubService;
import com.blockout.clubs.club.application.views.ClubView;
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
 * Implements the generated V1 internal Club API.
 */
@RestController
@RequiredArgsConstructor
public class ClubController implements ClubApi {

    private final ClubService clubService;
    private final ClubApiMapper mapper;
    private final ObjectMapper objectMapper;

    /**
     * Lists clubs using the existing optional identifier and active filters.
     */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:clubs')")
    public ResponseEntity<List<ClubInternalResponse>> listClubs(List<String> ids, Boolean active) {
        return ResponseEntity.ok(clubService.findClubs(ids, active).stream().map(mapper::toInternalResponse).toList());
    }

    /**
     * Returns one Club by identifier.
     */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:clubs')")
    public ResponseEntity<ClubInternalResponse> getClubById(String id) {
        return ResponseEntity.ok(mapper.toInternalResponse(clubService.getClubById(id)));
    }

    /**
     * Creates a Club from multipart JSON and an optional logo.
     */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_create:clubs')")
    public ResponseEntity<ClubInternalResponse> createClub(String data, MultipartFile image) {
        CreateClubInternalRequest request = readData(data, CreateClubInternalRequest.class);
        ClubView saved = clubService.createClub(mapper.toCommand(request, image));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(saved.id())
            .toUri();
        return ResponseEntity.created(location).body(mapper.toInternalResponse(saved));
    }

    /**
     * Updates a Club from multipart JSON and an optional replacement logo.
     */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:clubs')")
    public ResponseEntity<ClubInternalResponse> updateClub(String id, String data, MultipartFile image) {
        UpdateClubInternalRequest request = readData(data, UpdateClubInternalRequest.class);
        return ResponseEntity.ok(mapper.toInternalResponse(clubService.updateClub(id, mapper.toCommand(request, image))));
    }

    /**
     * Soft-deletes one Club through the existing V1 route.
     */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_delete:clubs')")
    public ResponseEntity<Void> deactivateClub(String id) {
        clubService.deactivateClub(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Returns the configured Club logo URL or an empty response when absent.
     */
    @Override
    public ResponseEntity<String> getClubLogo(String id) {
        String logoUrl = clubService.getClubById(id).logoUrl();
        if (logoUrl == null || logoUrl.isBlank()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(logoUrl);
    }

    private <T> T readData(String data, Class<T> requestType) {
        try {
            return objectMapper.readValue(data, requestType);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("The multipart data field is invalid.", exception);
        }
    }
}
