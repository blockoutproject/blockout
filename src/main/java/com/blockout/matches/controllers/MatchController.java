package com.blockout.matches.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.blockout.matches.models.Match;
import com.blockout.matches.services.MatchService;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    @Autowired
    private MatchService matchService;

    @Operation(summary = "Créer un nouveau match", description = "Crée un nouveau match avec les informations fournies")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Match créé avec succès"),
        @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PostMapping
    public ResponseEntity<Match> createMatch(@RequestBody Match match) {
        Match createdMatch = matchService.createMatch(match);
        return new ResponseEntity<>(createdMatch, HttpStatus.CREATED);
    }

    @Operation(summary = "Récupérer tous les matchs", description = "Retourne une liste de tous les matchs")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Liste des matchs renvoyée avec succès")
    })
    @GetMapping
    public ResponseEntity<List<Match>> getAllMatches() {
        List<Match> matches = matchService.getAllMatches();
        return new ResponseEntity<>(matches, HttpStatus.OK);
    }

    @Operation(summary = "Récupérer un match par ID", description = "Retourne un match spécifique en fonction de l'ID fourni")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Match trouvé"),
        @ApiResponse(responseCode = "404", description = "Match non trouvé")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Optional<Match>> getMatchById(
        @Parameter(description = "ID du match à récupérer") @PathVariable Long id) {
        Optional<Match> match = matchService.getMatchById(id);
        return match.isPresent() ? new ResponseEntity<>(match, HttpStatus.OK) : new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @Operation(summary = "Mettre à jour un match", description = "Met à jour un match avec les informations fournies")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Match mis à jour avec succès"),
        @ApiResponse(responseCode = "404", description = "Match non trouvé")
    })
    @PutMapping("/{id}")
    public ResponseEntity<Match> updateMatch(
        @Parameter(description = "ID du match à mettre à jour") @PathVariable Long id,
        @RequestBody Match updatedMatch) {
        try {
            Match updated = matchService.updateMatch(id, updatedMatch);
            return new ResponseEntity<>(updated, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @Operation(summary = "Supprimer un match", description = "Supprime un match en fonction de l'ID fourni")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Match supprimé avec succès"),
        @ApiResponse(responseCode = "404", description = "Match non trouvé")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMatch(
        @Parameter(description = "ID du match à supprimer") @PathVariable Long id) {
        matchService.deleteMatch(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}