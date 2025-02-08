package com.blockout.competitions.controllers;

import com.blockout.competitions.models.Category;
import com.blockout.competitions.models.CompetitionAssociation;
import com.blockout.competitions.models.dto.BulkPoolsDeactivateRequest;
import com.blockout.competitions.models.dto.BulkTeamsDeactivateRequest;
import com.blockout.competitions.models.dto.TeamAssociationStatsRequest;
import com.blockout.competitions.services.CompetitionAssociationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/competitions/v1")
public class CompetitionAssociationController {

    @Autowired
    private CompetitionAssociationService associationService;

    @Operation(summary = "Récupérer les associations actives (pool–team) pour une pool")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Associations renvoyées avec succès"),
        @ApiResponse(responseCode = "204", description = "Aucune association active trouvée pour cette pool")
    })
    @GetMapping("/pools/{poolId}/teams/active")
    public ResponseEntity<List<CompetitionAssociation>> getActiveTeamAssociationsByPool(
            @PathVariable Long poolId
    ) {
        List<CompetitionAssociation> activeAssocs = associationService.getActiveAssociationsByPool(poolId);
        if (activeAssocs.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(activeAssocs);
    }

    @Operation(summary = "Associer (ou réactiver) une équipe à une poule")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Association (Pool–Team) créée ou réactivée avec succès"),
    })
    @PostMapping("/pools/{poolId}/teams/{teamId}")
    public ResponseEntity<CompetitionAssociation> addTeamToPool(
            @PathVariable Long poolId,
            @PathVariable Long teamId,
            @RequestParam Category category) {

        CompetitionAssociation assoc = associationService.addOrActivateAssociation(poolId, teamId, category);
        return ResponseEntity.ok(assoc);
    }

    @Operation(summary = "Récupérer les associations actives pour une poule")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Liste des associations actives renvoyée avec succès"),
        @ApiResponse(responseCode = "204", description = "Aucune association active trouvée pour cette poule"),
    })
    @GetMapping("/pools/{poolId}/teams")
    public ResponseEntity<List<CompetitionAssociation>> getActiveTeamsForPool(@PathVariable Long poolId) {
        List<CompetitionAssociation> associations = associationService.getActiveAssociationsByPool(poolId);
        if (associations.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(associations);
    }

    @Operation(summary = "Récupérer les associations actives pour une équipe")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Liste des associations renvoyée avec succès"),
        @ApiResponse(responseCode = "204", description = "Aucune association active trouvée pour cette équipe"),
    })
    @GetMapping("/teams/{teamId}/pools")
    public ResponseEntity<List<CompetitionAssociation>> getActivePoolsForTeam(@PathVariable Long teamId) {
        List<CompetitionAssociation> associations = associationService.getActivePoolsByTeam(teamId);
        if (associations.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(associations);
    }

    @Operation(summary = "Désactiver en masse les associations Pool–Team qui ne figurent plus dans la liste scrappée")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Associations désactivées en masse avec succès"),
    })
    @PutMapping("/pools/{poolId}/teams/bulk-deactivate")
    public ResponseEntity<Void> bulkDeactivateTeams(
            @PathVariable Long poolId,
            @RequestBody BulkTeamsDeactivateRequest request) {
        associationService.bulkDeactivateTeamsForPool(poolId, request.getScrapedTeamIds());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Désactiver en masse les pools qui ne figurent plus dans la liste scrappée")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Pools désactivées en masse avec succès"),
    })
    @PutMapping("/pools/bulk-deactivate")
    public ResponseEntity<Void> bulkDeactivatePools(
            @RequestBody BulkPoolsDeactivateRequest request) {
        associationService.bulkDeactivatePools(request.getCategory(), request.getScrapedPoolIds());
        return ResponseEntity.ok().build();
    }
    @Operation(summary = "Mettre à jour les statistiques de l'association (pool–team)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Statistiques mises à jour avec succès"),
        @ApiResponse(responseCode = "404", description = "Association non trouvée")
    })
    @PutMapping("/pools/{poolId}/teams/{teamId}/stats")
    public ResponseEntity<CompetitionAssociation> updateTeamAssociationStats(
            @PathVariable Long poolId,
            @PathVariable Long teamId,
            @RequestBody TeamAssociationStatsRequest statsRequest
    ) {
        CompetitionAssociation updatedAssoc = associationService.updateTeamAssociationStats(poolId, teamId, statsRequest);
        return ResponseEntity.ok(updatedAssoc);
    }
}