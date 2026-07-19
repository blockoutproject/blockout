package com.blockout.competitions.association.api;

import com.blockout.competitions.association.api.mappers.CompetitionAssociationApiMapper;
import com.blockout.competitions.association.api.models.BulkDeactivateClubsInternalRequest;
import com.blockout.competitions.association.api.models.BulkDeactivatePoolsInternalRequest;
import com.blockout.competitions.association.api.models.BulkDeactivateTeamsInternalRequest;
import com.blockout.competitions.association.api.models.CompetitionAssociationInternalResponse;
import com.blockout.competitions.association.api.models.PoolWithRankingInternalResponse;
import com.blockout.competitions.association.api.models.UpdateAssociationStatsInternalRequest;
import com.blockout.competitions.association.application.CompetitionAssociationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Exposes the handwritten V1 internal Competition Association API. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/competitions")
public class CompetitionAssociationController {

    private final CompetitionAssociationService associationService;
    private final CompetitionAssociationApiMapper mapper;

    @PreAuthorize("hasAuthority('SCOPE_create:competitions') and hasAuthority('SCOPE_update:competitions')")
    @PostMapping("/pools/{poolId}/teams/{teamId}")
    public ResponseEntity<CompetitionAssociationInternalResponse> addTeamToPool(
            @PathVariable Long poolId,
            @PathVariable Long teamId,
            @RequestParam String clubId) {
        return ResponseEntity.ok(mapper.toInternalResponse(
                associationService.addOrReactivateAssociation(poolId, teamId, clubId)));
    }

    @GetMapping("/pools/{poolId}/teams")
    public ResponseEntity<List<CompetitionAssociationInternalResponse>> listPoolTeams(@PathVariable Long poolId) {
        return ResponseEntity.ok(associationService.getActiveAssociationsByPool(poolId).stream()
                .map(mapper::toInternalResponse)
                .toList());
    }

    @GetMapping("/teams/{teamId}/pools")
    public ResponseEntity<List<CompetitionAssociationInternalResponse>> listAssociationsByTeam(
            @PathVariable Long teamId) {
        return ResponseEntity.ok(associationService.getActiveAssociationsByTeam(teamId).stream()
                .map(mapper::toInternalResponse)
                .toList());
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:competitions')")
    @PutMapping("/pools/{poolId}/teams/bulk-deactivate")
    public ResponseEntity<Void> bulkDeactivateTeams(
            @PathVariable Long poolId,
            @RequestBody BulkDeactivateTeamsInternalRequest request) {
        associationService.bulkDeactivateTeamsByPool(poolId, request.missingTeamIds());
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:competitions')")
    @PutMapping("/pools/bulk-deactivate")
    public ResponseEntity<Void> bulkDeactivatePools(@RequestBody BulkDeactivatePoolsInternalRequest request) {
        associationService.bulkDeactivatePools(request.missingPoolIds());
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:competitions')")
    @PutMapping("/clubs/bulk-deactivate")
    public ResponseEntity<Void> bulkDeactivateClubs(@RequestBody BulkDeactivateClubsInternalRequest request) {
        associationService.bulkDeactivateClubs(request.missingClubIds());
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_update:competitions')")
    @PutMapping("/pools/{poolId}/teams/{teamId}/stats")
    public ResponseEntity<CompetitionAssociationInternalResponse> updateStats(
            @PathVariable Long poolId,
            @PathVariable Long teamId,
            @RequestBody UpdateAssociationStatsInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(
                associationService.updateTeamAssociationStats(poolId, teamId, mapper.toCommand(request))));
    }

    @GetMapping("/teams/{teamId}/pools-with-ranking")
    public ResponseEntity<List<PoolWithRankingInternalResponse>> getPoolsAndRankingsByTeam(@PathVariable Long teamId) {
        return ResponseEntity.ok(associationService.getPoolsAndRankingsByTeam(teamId).stream()
                .map(mapper::toInternalResponse)
                .toList());
    }
}
