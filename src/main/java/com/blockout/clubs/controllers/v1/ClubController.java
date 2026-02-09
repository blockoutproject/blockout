package com.blockout.clubs.controllers.v1;

import com.blockout.clubs.models.dto.ClubUpdateDTO;
import com.blockout.clubs.models.entities.Club;
import com.blockout.clubs.services.ClubService;
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

import java.net.URI;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/clubs")
public class ClubController {

    private final ClubService clubService;
    private final ObjectMapper objectMapper;

    @Operation(summary = "Lister les clubs", description = "Renvoie les clubs avec des filtres facultatifs.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liste des clubs"),
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_read:clubs')")
    @GetMapping
    public ResponseEntity<List<Club>> listClubs(
            @RequestParam(required = false) List<String> ids,
            @RequestParam(required = false) Boolean active) {
        List<Club> clubs = clubService.findClubs(ids, active);
        return ResponseEntity.ok(clubs);
    }

    @Operation(summary = "Récupérer un club", description = "Renvoie un club par son identifiant.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Club trouvé"),
            @ApiResponse(responseCode = "404", description = "Club introuvable")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_read:clubs')")
    @GetMapping("/{id}")
    public ResponseEntity<Club> getClubById(@PathVariable String id) {
        Club club = clubService.getClubById(id);
        return ResponseEntity.ok(club);
    }

    @Operation(summary = "Créer un club", description = "Crée un nouveau club.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Club créé"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_create:clubs')")
    @PostMapping(consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Club> createClub(
            @RequestPart("data") String json,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        ClubUpdateDTO dto = objectMapper.readValue(json, ClubUpdateDTO.class);
        Club saved = clubService.createClub(dto, image);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(saved.getId())
                .toUri();

        return ResponseEntity.created(location).body(saved);
    }

    @Operation(summary = "Mettre à jour un club", description = "Met à jour un club existant.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Club mis à jour"),
            @ApiResponse(responseCode = "404", description = "Club introuvable")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_update:clubs')")
    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Club> updateClub(
            @PathVariable String id,
            @RequestPart("data") String json,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        ClubUpdateDTO dto = objectMapper.readValue(json, ClubUpdateDTO.class);
        Club updated = clubService.updateClub(id, dto, image);
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "Désactiver un club", description = "Désactive (soft delete) un club.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Club désactivé"),
            @ApiResponse(responseCode = "404", description = "Club introuvable")
    })
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_delete:clubs')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateClub(@PathVariable String id) {
        clubService.deactivateClub(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Récupérer le logo d’un club", description = "Retourne l’URL du logo pour un club donné.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Logo trouvé"),
            @ApiResponse(responseCode = "204", description = "Aucun logo défini"),
            @ApiResponse(responseCode = "404", description = "Club introuvable")
    })
    @GetMapping("/{id}/logo")
    public ResponseEntity<String> getClubLogo(@PathVariable String id) {
        Club club = clubService.getClubById(id);

        if (club.getLogoUrl() == null || club.getLogoUrl().isBlank()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(club.getLogoUrl());
    }
}