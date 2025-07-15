package com.blockout.clubs.controllers.v1;

import com.blockout.clubs.models.Club;
import com.blockout.clubs.models.dto.ClubUpdateDTO;
import com.blockout.clubs.services.ClubService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
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

    @Operation(summary = "Lister les clubs", description = "Renvoie les clubs avec des filtres facultatifs.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liste des clubs"),
    })
    @GetMapping
    public ResponseEntity<List<Club>> listClubs(@RequestParam(required = false) List<String> ids) {
        List<Club> clubs = clubService.findClubs(ids);
        return ResponseEntity.ok(clubs);
    }

    @Operation(summary = "Récupérer un club", description = "Renvoie un club par son identifiant.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Club trouvé"),
            @ApiResponse(responseCode = "404", description = "Club introuvable")
    })
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
    @PostMapping
    public ResponseEntity<Club> createClub(@RequestBody Club club) {
        Club created = clubService.createClub(club);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Operation(summary = "Mettre à jour un club", description = "Met à jour un club existant.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Club mis à jour"),
            @ApiResponse(responseCode = "404", description = "Club introuvable")
    })
    @PutMapping("/{id}")
    public ResponseEntity<Club> updateClub(
            @PathVariable String id,
            @RequestBody ClubUpdateDTO dto,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        Club result = clubService.updateClub(id, dto, image);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Désactiver un club", description = "Désactive (soft delete) un club.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Club désactivé"),
            @ApiResponse(responseCode = "404", description = "Club introuvable")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateClub(@PathVariable String id) {
        clubService.deactivateClub(id);
        return ResponseEntity.noContent().build();
    }
}