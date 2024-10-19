package com.blockout.teams.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.blockout.teams.models.Team;
import com.blockout.teams.services.TeamService;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/teams")
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
        return new ResponseEntity<>(createdTeam, HttpStatus.CREATED);
    }

    @Operation(summary = "Récupérer toutes les équipes", description = "Retourne une liste de toutes les équipes disponibles.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Liste des équipes renvoyée avec succès")
    })
    @GetMapping
    public ResponseEntity<List<Team>> getAllTeams() {
        List<Team> teams = teamService.getAllTeams();
        return new ResponseEntity<>(teams, HttpStatus.OK);
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
        return team.isPresent() ? new ResponseEntity<>(team, HttpStatus.OK) : new ResponseEntity<>(HttpStatus.NOT_FOUND);
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
            return new ResponseEntity<>(updated, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @Operation(summary = "Supprimer une équipe", description = "Supprime une équipe en fonction de l'ID fourni.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Équipe supprimée avec succès"),
        @ApiResponse(responseCode = "404", description = "Équipe non trouvée")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeam(
        @Parameter(description = "ID de l'équipe à supprimer") @PathVariable Long id) {
        teamService.deleteTeam(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}