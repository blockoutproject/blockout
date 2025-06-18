package com.blockout.competitions.controllers.v1;

import com.blockout.competitions.models.CompetitionAssociation;
import com.blockout.competitions.models.dto.BulkClubsDeactivateRequest;
import com.blockout.competitions.models.dto.BulkPoolsDeactivateRequest;
import com.blockout.competitions.models.dto.BulkTeamsDeactivateRequest;
import com.blockout.competitions.models.dto.TeamAssociationStatsRequest;
import com.blockout.competitions.models.enums.Category;
import com.blockout.competitions.services.CompetitionAssociationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/competitions")
public class CompetitionAssociationController {

    private final CompetitionAssociationService associationService;

    @Operation(summary = "Add or reactivate team in pool")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Association created or reactivated")
    })
    @PostMapping("/pools/{poolId}/teams/{teamId}")
    public ResponseEntity<CompetitionAssociation> addTeamToPool(
            @PathVariable Long poolId,
            @PathVariable Long teamId,
            @RequestParam(name = "club_id") String clubId,
            @RequestParam Category category) {

        CompetitionAssociation assoc = associationService.addOrReactivateAssociation(poolId, teamId, clubId, category);
        return ResponseEntity.ok(assoc);
    }

    @Operation(summary = "List associations for a pool")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Associations returned"),
            @ApiResponse(responseCode = "204", description = "No association found")
    })
    @GetMapping("/pools/{poolId}/teams")
    public ResponseEntity<List<CompetitionAssociation>> listPoolTeams(
            @PathVariable Long poolId,
            @RequestParam(required = false, defaultValue = "false", name = "active_only") boolean activeOnly) {

        List<CompetitionAssociation> list = activeOnly
                ? associationService.getActiveAssociationsByPool(poolId)
                : associationService.getAssociationsByPool(poolId);
        return ResponseEntity.ok(list);
    }

    @Operation(summary = "List active pools for a team")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Associations returned"),
            @ApiResponse(responseCode = "204", description = "No association found")
    })
    @GetMapping("/teams/{teamId}/pools")
    public ResponseEntity<List<CompetitionAssociation>> listPoolsForTeam(@PathVariable Long teamId) {
        List<CompetitionAssociation> list = associationService.getActivePoolsByTeam(teamId);
        return ResponseEntity.ok(list);
    }

    @Operation(summary = "Bulk deactivate teams in a pool")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Teams deactivated")
    })
    @PutMapping("/pools/{poolId}/teams/bulk-deactivate")
    public ResponseEntity<Void> bulkDeactivateTeams(
            @PathVariable Long poolId,
            @RequestBody BulkTeamsDeactivateRequest request) {

        associationService.bulkDeactivateTeamsByPool(poolId, request.getMissingTeamIds());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Bulk deactivate pools")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Pools deactivated")
    })
    @PutMapping("/pools/bulk-deactivate")
    public ResponseEntity<Void> bulkDeactivatePools(@RequestBody BulkPoolsDeactivateRequest request) {
        associationService.bulkDeactivatePools(request.getMissingPoolIds());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Bulk deactivate clubs")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Clubs deactivated")
    })
    @PutMapping("/clubs/bulk-deactivate")
    public ResponseEntity<Void> bulkDeactivateClubs(@RequestBody BulkClubsDeactivateRequest request) {
        associationService.bulkDeactivateClubs(request.getMissingClubIds());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/stats")
    public String testStats(@RequestBody TeamAssociationStatsRequest request) {
        System.out.println("📦 Classe réelle : " + request.getClass().getName());
        System.out.println("🎯 winsThreeToZero = " + request.getWinsThreeToZero());
        return "OK";
    }

    @Operation(summary = "Update stats for a team–pool association")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Stats updated"),
            @ApiResponse(responseCode = "404", description = "Association not found")
    })
    @PutMapping("/pools/{poolId}/teams/{teamId}/stats")
    public ResponseEntity<CompetitionAssociation> updateStats(
            @PathVariable Long poolId,
            @PathVariable Long teamId,
            @RequestBody TeamAssociationStatsRequest body) {

        CompetitionAssociation updated = associationService.updateTeamAssociationStats(poolId, teamId, body);
        return ResponseEntity.ok(updated);
    }
}