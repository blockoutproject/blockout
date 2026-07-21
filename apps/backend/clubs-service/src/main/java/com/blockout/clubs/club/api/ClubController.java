package com.blockout.clubs.club.api;

import com.blockout.clubs.club.api.mappers.ClubApiMapper;
import com.blockout.clubs.club.api.models.ClubInternalResponse;
import com.blockout.clubs.club.api.models.CreateClubInternalRequest;
import com.blockout.clubs.club.api.models.UpdateClubInternalRequest;
import com.blockout.clubs.club.application.ClubService;
import com.blockout.clubs.club.application.views.ClubView;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
 * Exposes the handwritten V1 internal Club API.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/clubs")
public class ClubController {

    private final ClubService clubService;
    private final ClubApiMapper mapper;
    private final ObjectMapper objectMapper;

    /**
     * Lists clubs using the existing optional identifier and active filters.
     */
    @Operation(summary = "List clubs", description = "Returns clubs with optional filters.")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Club list"))
    @PreAuthorize("hasAuthority('SCOPE_read:clubs')")
    @GetMapping
    public ResponseEntity<List<ClubInternalResponse>> listClubs(
        @RequestParam(required = false) List<String> ids,
        @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(clubService.findClubs(ids, active).stream().map(mapper::toInternalResponse).toList());
    }

    /**
     * Returns one Club by identifier.
     */
    @Operation(summary = "Get a club", description = "Returns a club by id.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Club found"),
        @ApiResponse(responseCode = "404", description = "Club not found")
    })
    @PreAuthorize("hasAuthority('SCOPE_read:clubs')")
    @GetMapping("/{id}")
    public ResponseEntity<ClubInternalResponse> getClubById(@PathVariable String id) {
        return ResponseEntity.ok(mapper.toInternalResponse(clubService.getClubById(id)));
    }

    /**
     * Creates a Club from multipart JSON and an optional logo.
     */
    @Operation(summary = "Create a club", description = "Creates a club with an optional logo image.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Club created"),
        @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PreAuthorize("hasAuthority('SCOPE_create:clubs')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ClubInternalResponse> createClub(
        @RequestPart("data") String json,
        @RequestPart(value = "image", required = false) MultipartFile image)
        throws JsonProcessingException, IOException {
        CreateClubInternalRequest request = objectMapper.readValue(json, CreateClubInternalRequest.class);
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
    @Operation(summary = "Update a club", description = "Updates an existing club.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Club updated"),
        @ApiResponse(responseCode = "404", description = "Club not found")
    })
    @PreAuthorize("hasAuthority('SCOPE_update:clubs')")
    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ClubInternalResponse> updateClub(
        @PathVariable String id,
        @RequestPart("data") String json,
        @RequestPart(value = "image", required = false) MultipartFile image)
        throws JsonProcessingException, IOException {
        UpdateClubInternalRequest request = objectMapper.readValue(json, UpdateClubInternalRequest.class);
        return ResponseEntity.ok(mapper.toInternalResponse(clubService.updateClub(id, mapper.toCommand(request, image))));
    }

    /**
     * Soft-deletes one Club through the existing V1 route.
     */
    @Operation(summary = "Deactivate a club", description = "Soft-deletes a club.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Club deactivated"),
        @ApiResponse(responseCode = "404", description = "Club not found")
    })
    @PreAuthorize("hasAuthority('SCOPE_delete:clubs')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateClub(@PathVariable String id) {
        clubService.deactivateClub(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Returns the configured Club logo URL or an empty response when absent.
     */
    @Operation(summary = "Get a club logo", description = "Returns the logo URL for a club.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Logo found"),
        @ApiResponse(responseCode = "204", description = "No logo configured"),
        @ApiResponse(responseCode = "404", description = "Club not found")
    })
    @GetMapping("/{id}/logo")
    public ResponseEntity<String> getClubLogo(@PathVariable String id) {
        String logoUrl = clubService.getClubById(id).logoUrl();
        if (logoUrl == null || logoUrl.isBlank()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(logoUrl);
    }
}
