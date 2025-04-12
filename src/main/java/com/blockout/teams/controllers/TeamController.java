package com.blockout.teams.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.blockout.teams.models.Team;
import com.blockout.teams.models.TeamFormat;
import com.blockout.teams.models.TeamGender;
import com.blockout.teams.services.TeamService;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.net.URI;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/teams/v1")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @Operation(summary = "Créer une équipe", description = "Crée une nouvelle équipe avec les informations fournies.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Équipe créée avec succès"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PostMapping("/teams")
    public ResponseEntity<Team> createTeam(@RequestBody Team team) {
        Team createdTeam = teamService.createTeam(team);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(createdTeam.getId())
                .toUri();
        return ResponseEntity.created(location).body(createdTeam);
    }

    @Operation(summary = "Rechercher des équipes par nom", description = "Retourne une liste d'équipes correspondant partiellement au nom fourni, limité à 20 résultats.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Équipes trouvées"),
            @ApiResponse(responseCode = "204", description = "Aucune équipe ne correspond à la recherche")
    })
    @GetMapping("/teams/by-name")
    public ResponseEntity<List<Team>> searchTeamsByName(
            @Parameter(description = "Texte de la recherche partielle") @RequestParam("query") String query) {

        List<Team> teams = teamService.fuzzySearchTeams(query);

        if (teams.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(teams);
    }

    @Operation(summary = "Récupérer des équipes par IDs", description = "Retourne uniquement les équipes correspondant aux IDs fournis (liste non vide).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Équipes trouvées"),
            @ApiResponse(responseCode = "400", description = "Liste d'IDs absente ou vide"),
            @ApiResponse(responseCode = "404", description = "Aucune équipe trouvée pour les IDs fournis")
    })
    @PostMapping("/teams/by-ids")
    public ResponseEntity<List<Team>> getTeamsByIds(@RequestParam List<Long> ids) {

        if (ids.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<Team> teams = teamService.getTeamsByIds(ids);

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
    @GetMapping("/teams/{id}")
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
    @PutMapping("/teams/{id}")
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

    @Operation(summary = "Récupérer les équipes par division_name, format et gender", description = "Retourne une liste des équipes filtrées par division_name, format et gender.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Équipes trouvées avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucune équipe trouvée avec les critères fournis")
    })
    @GetMapping("/teams/search")
    public ResponseEntity<List<Team>> getTeamsByDivisionFormatGender(
            @Parameter(description = "Nom de la division") @RequestParam("division_name") @JsonProperty("division_name") String divisionName,
            @Parameter(description = "Format de l'équipe") @RequestParam("format") @JsonProperty("format") TeamFormat format,
            @Parameter(description = "Genre de l'équipe") @RequestParam("gender") @JsonProperty("gender") TeamGender gender) {

        List<Team> teams = teamService.getTeamsByDivisionFormatGender(divisionName, format, gender);
        if (teams.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(teams);
    }

    @Operation(summary = "Récupérer tous les club IDs uniques", description = "Retourne une liste de tous les identifiants de clubs uniques présents parmi les équipes.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des club IDs uniques récupérée avec succès"),
            @ApiResponse(responseCode = "204", description = "Aucun club ID trouvé dans les équipes")
    })
    @GetMapping("/teams/club-ids")
    public ResponseEntity<List<String>> getUniqueClubIds() {
        List<String> clubIds = teamService.getUniqueClubIds();

        if (clubIds.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(clubIds);
}
}
