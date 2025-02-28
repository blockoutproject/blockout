package com.blockout.matches.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.Match;
import com.blockout.matches.models.MatchStatus;
import com.blockout.matches.models.dto.DayPageDTO;
import com.blockout.matches.services.MatchService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/matches/v1")
public class MatchController {

    @Autowired
    private MatchService matchService;

    @Operation(summary = "Créer un nouveau match", description = "Crée un nouveau match avec les informations fournies")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Match créé avec succès"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PostMapping("/matches")
    public ResponseEntity<Match> createMatch(@RequestBody Match match) {
        Match createdMatch = matchService.createMatch(match);
        return ResponseEntity.created(null).body(createdMatch);
    }

    @Operation(summary = "Récupérer les matchs avec pagination", description = "Retourne une liste paginée de matchs")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste paginée des matchs renvoyée avec succès")
    })
    @GetMapping("/matches")
    public ResponseEntity<Page<Match>> getMatches(Pageable pageable) {
        Page<Match> matches = matchService.getAllMatches(pageable);
        return ResponseEntity.ok(matches);
    }

    @Operation(summary = "Récupérer les matchs par poule", description = "Retourne une liste de tous les matchs associés à une poule spécifique.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des matchs renvoyée avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucun match trouvé pour cette poule"),
    })
    @GetMapping("/pools/{poolId}/matches")
    public ResponseEntity<List<Match>> getMatchesByPool(
            @PathVariable Long poolId) {

        List<Match> matches = matchService.getMatchesByPool(poolId);
        if (matches.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(matches);
    }

    @Operation(summary = "Récupérer les matchs groupés par jour avec pagination (optionnel: poolId et status)", description = """
                Retourne une liste paginée de groupes de matchs par jour.
                - Si 'pool_id' est omis ou null, on renvoie toutes les poules.
                - Le paramètre 'status' permet de filtrer :
                    * Par défaut (status non renseigné ou FINISHED) : matchs passés.
                    * Si status=UPCOMING : matchs à venir.
            """)
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste paginée des groupes de matchs renvoyée avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucun match trouvé"),
    })
    @GetMapping("/matches/day-based")
    public ResponseEntity<DayPageDTO> getMatchesDayBased(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "3") int size,
            @RequestParam(name = "pool_id", required = false) Long poolId,
            @RequestParam(name = "status", required = false) MatchStatus status,
            @RequestParam(name = "team_id", required = false) Long teamId // <-- Nouvel ajout
    ) {
        DayPageDTO dayPage = matchService.getMatchesByDay(poolId, page, size, status, teamId);
        if (dayPage.getDayMatches().isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(dayPage);
    }

    @Operation(summary = "Récupérer un match par league_code et match_code", description = "Retourne un match spécifique basé sur le league_code et le match_code")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Match renvoyé avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucun match trouvé")
    })
    @GetMapping("/leagues/{leagueCode}/matches/{matchCode}")
    public ResponseEntity<Match> getMatchByLeagueCodeAndMatchCode(
            @Parameter(description = "Code de la ligue") @PathVariable String leagueCode,
            @Parameter(description = "Code du match") @PathVariable String matchCode) {

        Optional<Match> match = matchService.getMatchByLeagueCodeAndMatchCode(leagueCode, matchCode);
        return match.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @Operation(summary = "Récupérer un match par ID", description = "Retourne un match spécifique en fonction de l'ID fourni")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Match trouvé"),
            @ApiResponse(responseCode = "404", description = "Match non trouvé")
    })
    @GetMapping("/matches/{id}")
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
    @PutMapping("/matches/{id}")
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
    @PutMapping("/matches/{id}/deactivate")
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
    @GetMapping("/pools/{poolId}/matches/active")
    public ResponseEntity<List<Match>> getActiveMatchesByPoolId(
            @PathVariable Long poolId) {

        List<Match> activeMatches = matchService.getActiveMatchesByPoolId(poolId);

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
    @GetMapping("/matches/started")
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
    @GetMapping("/pools/{poolId}/matches/search")
    public ResponseEntity<Match> getMatchByPoolAndTeamsAndDate(
            @PathVariable Long poolId,
            @RequestParam(name = "team_id_a") Long teamIdA,
            @RequestParam(name = "team_id_b") Long teamIdB,
            @RequestParam(name = "match_date") String matchDate) {

        LocalDate parsedMatchDate = LocalDate.parse(matchDate);
        Optional<Match> match = matchService.getMatchByPoolAndTeamsAndDate(poolId, teamIdA, teamIdB, parsedMatchDate);

        return match.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }
}