package com.blockout.teams.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.blockout.teams.exceptions.TeamNotFoundException;
import com.blockout.teams.models.Team;
import com.blockout.teams.services.TeamService;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/teams/v1")
public class TeamController {

    @Autowired
    private TeamService teamService;

    @Operation(summary = "Créer une équipe", description = "Crée une nouvelle équipe avec les informations fournies.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Équipe créée avec succès"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PostMapping
    public ResponseEntity<Team> createTeam(@RequestBody Team team) {
        Team createdTeam = teamService.createTeam(team);
        return ResponseEntity.created(null).body(createdTeam);
    }

    @Operation(summary = "Récupérer les équipes par pool_id et team_name", description = "Retourne une équipe spécifique filtrée par pool_id et team_name.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Équipe trouvée avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucune équipe trouvée avec les critères fournis")
    })
    @GetMapping("/search")
    public ResponseEntity<Team> getTeamByPoolIdAndTeamName(
            @Parameter(description = "ID de la pool") @RequestParam Long pool_id,
            @Parameter(description = "Nom de l'équipe") @RequestParam String team_name) {

        Optional<Team> team = teamService.getTeamsByPoolIdAndTeamName(pool_id, team_name);
        return team.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @Operation(summary = "Récupérer les équipes d'une poule", description = "Retourne une liste de toutes les équipes associées à une poule spécifique.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des équipes renvoyée avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucune équipe trouvée pour cette poule"),
    })
    @GetMapping("/pool/{poolId}")
    public ResponseEntity<List<Team>> getTeamsByPool(
            @Parameter(description = "ID de la poule dont les équipes doivent être récupérées") @PathVariable Long poolId) {

        List<Team> teams = teamService.getTeamsByPool(poolId);
        if (teams.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(teams);
    }

    @Operation(summary = "Récupérer des équipes", description = "Retourne toutes les équipes ou celles correspondant aux IDs fournis.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Équipes trouvées"),
            @ApiResponse(responseCode = "404", description = "Aucune équipe trouvée")
    })
    @GetMapping
    public ResponseEntity<List<Team>> getTeamsByIds(
            @Parameter(description = "Liste des IDs des équipes à récupérer (séparés par des virgules)") @RequestParam(required = false) List<Long> ids) {

        List<Team> teams;

        if (ids == null || ids.isEmpty()) {
            teams = teamService.getAllTeams();
        } else {
            teams = teamService.getTeamsByIds(ids);
        }

        if (teams.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(teams);
    }

    @Operation(summary = "Récupérer une équipe par ID", description = "Retourne une équipe spécifique en fonction de l'ID fourni.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Équipe trouvée"),
            @ApiResponse(responseCode = "404", description = "Équipe non trouvée")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Optional<Team>> getTeamById(
            @Parameter(description = "ID de l'équipe à récupérer") @PathVariable Long id) {
        Optional<Team> team = teamService.getTeamById(id);
        return team.isPresent() ? ResponseEntity.ok(team)
                : ResponseEntity.notFound().build();
    }

    @Operation(summary = "Mettre à jour une équipe", description = "Met à jour une équipe avec les informations fournies.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Équipe mise à jour avec succès"),
            @ApiResponse(responseCode = "404", description = "Équipe non trouvée")
    })
    @PutMapping("/{id}")
    public ResponseEntity<Team> updateTeam(
            @Parameter(description = "ID de l'équipe à mettre à jour") @PathVariable Long id,
            @RequestBody Team updatedTeam) {
        try {
            Team updated = teamService.updateTeam(id, updatedTeam);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Désactiver une équipe", description = "Désactive une équipe en fonction de l'ID fourni")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Équipe désactivée avec succès"),
            @ApiResponse(responseCode = "404", description = "Équipe non trouvée")
    })
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivateTeam(
            @Parameter(description = "ID de l'équipe à désactiver") @PathVariable Long id) {
        try {
            teamService.deactivateTeam(id);
            return ResponseEntity.ok().build();
        } catch (TeamNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Récupérer les équipes actives par pool_id", description = "Retourne une liste des équipes actives pour une pool donnée.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des équipes actives renvoyée avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucune équipe active trouvée pour cette pool")
    })
    @GetMapping("/active")
    public ResponseEntity<List<Team>> getActiveTeamsByPoolId(
            @RequestParam Long pool_id) {

        List<Team> activeTeams = teamService.getActiveTeamsByPoolId(pool_id);

        if (activeTeams.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(activeTeams);
    }
}
