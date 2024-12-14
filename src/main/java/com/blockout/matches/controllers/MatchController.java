package com.blockout.matches.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.Match;
import com.blockout.matches.models.MatchStatus;
import com.blockout.matches.services.MatchService;

import java.time.LocalDateTime;
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
        return ResponseEntity.created(null).body(createdMatch);
    }

    @Operation(summary = "Récupérer tous les matchs", description = "Retourne une liste de tous les matchs")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des matchs renvoyée avec succès")
    })
    @GetMapping
    public ResponseEntity<List<Match>> getAllMatches() {
        List<Match> matches = matchService.getAllMatches();
        return ResponseEntity.ok(matches);
    }

    @Operation(summary = "Récupérer les matchs par poule", description = "Retourne une liste de tous les matchs associés à une poule spécifique.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des matchs renvoyée avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucun match trouvé pour cette poule"),
    })
    @GetMapping("/pool/{poolId}")
    public ResponseEntity<List<Match>> getMatchesByPool(
            @PathVariable Long poolId) {

        List<Match> matches = matchService.getMatchesByPool(poolId);
        if (matches.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(matches);
    }

    @Operation(summary = "Récupérer un match par league_code et match_code", description = "Retourne un match spécifique basé sur le league_code et le match_code")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Match renvoyé avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucun match trouvé")
    })
    @GetMapping("/{league_code}/{match_code}")
    public ResponseEntity<Match> getMatchByLeagueCodeAndMatchCode(
            @Parameter(description = "Code de la ligue") @PathVariable String league_code,
            @Parameter(description = "Code du match") @PathVariable String match_code) {

        Optional<Match> match = matchService.getMatchByLeagueCodeAndMatchCode(league_code, match_code);
        return match.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
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
        return match.isPresent() ? ResponseEntity.ok(match)
                : ResponseEntity.notFound().build();
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
            return ResponseEntity.ok(updated);
        } catch (MatchNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Désactiver un match", description = "Désactive un match en fonction de l'ID fourni")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Match désactivé avec succès"),
            @ApiResponse(responseCode = "404", description = "Match non trouvé")
    })
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivateMatch(
            @Parameter(description = "ID du match à désactiver") @PathVariable Long id) {
        try {
            matchService.deactivateMatch(id);
            return ResponseEntity.ok().build();
        } catch (MatchNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Récupérer les matchs actifs par pool_id", description = "Retourne une liste des matchs actifs pour une pool donnée.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des matchs actifs renvoyée avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucun match actif trouvé pour cette pool"),
    })
    @GetMapping("/active")
    public ResponseEntity<List<Match>> getActiveMatchesByPoolId(
            @RequestParam Long pool_id) {

        List<Match> activeMatches = matchService.getActiveMatchesByPoolId(pool_id);

        if (activeMatches.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(activeMatches);
    }

    @Operation(summary = "Récupérer les matchs qui ont commencé", description = "Retourne les matchs dont l'état est 'UPCOMING', mais dont la date est inférieure ou égale à l'heure actuelle.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des matchs en cours renvoyée avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucun match trouvé"),
    })
    @GetMapping("/started")
    public ResponseEntity<List<Match>> getStartedMatches(
            @RequestParam MatchStatus status,
            @RequestParam boolean active,
            @RequestParam String current_time) {

        LocalDateTime currentTime = LocalDateTime.parse(current_time);
        List<Match> startedMatches = matchService.getStartedMatches(status, active, currentTime);

        if (startedMatches.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(startedMatches);
    }

    @Operation(summary = "Récupérer un match par pool_id, team_a_id, team_b_id et match_date", description = "Retourne un match spécifique basé sur pool_id, team_a_id, team_b_id, et match_date.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Match trouvé avec succès"),
            @ApiResponse(responseCode = "404", description = "Aucun match trouvé avec les critères fournis")
    })
    @GetMapping("/search")
    public ResponseEntity<Match> getMatchByPoolAndTeamsAndDate(
            @RequestParam Long pool_id,
            @RequestParam Long team_id_a,
            @RequestParam Long team_id_b,
            @RequestParam String match_date) {

        LocalDateTime matchDate = LocalDateTime.parse(match_date);
        Optional<Match> match = matchService.getMatchByPoolAndTeamsAndDate(pool_id, team_id_a, team_id_b, matchDate);

        return match.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }
}