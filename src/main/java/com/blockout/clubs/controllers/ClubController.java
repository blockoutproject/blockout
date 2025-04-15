package com.blockout.clubs.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.blockout.clubs.models.Club;
import com.blockout.clubs.services.ClubService;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/clubs/v1")
public class ClubController {

    private final ClubService clubService;

    public ClubController(ClubService clubService) {
        this.clubService = clubService;
    }

    @Operation(summary = "Récupérer tous les clubs", description = "Retourne une liste de tous les clubs disponibles.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des clubs renvoyée avec succès")
    })
    @GetMapping("/clubs")
    public ResponseEntity<List<Club>> getAllClubs() {
        List<Club> clubs = clubService.getAllClubs();
        return ResponseEntity.ok(clubs);
    }

    @Operation(summary = "Créer un club", description = "Crée un nouveau club avec les informations fournies.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Club créée avec succès"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PostMapping("/clubs")
    public ResponseEntity<Club> createClub(@RequestBody Club club) {
        Club createdClub = clubService.createClub(club);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(createdClub.getId())
                .toUri();
        return ResponseEntity.created(location).body(createdClub);
    }

    @Operation(summary = "Mettre à jour un club", description = "Met à jour un club avec les informations fournies.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Club mis à jour avec succès"),
            @ApiResponse(responseCode = "404", description = "Club non trouvée")
    })
    @PutMapping("/clubs/{id}")
    public ResponseEntity<Club> updateClub(
            @Parameter(description = "ID du club à mettre à jour") @PathVariable String id,
            @RequestBody Club updatedClub) {
        try {
            Club updated = clubService.updateClub(id, updatedClub);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
