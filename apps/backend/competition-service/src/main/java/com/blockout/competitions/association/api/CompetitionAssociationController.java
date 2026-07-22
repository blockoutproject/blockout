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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Implements the generated V1 internal Competition Association API.
 */
@RestController
@RequiredArgsConstructor
public class CompetitionAssociationController implements CompetitionAssociationApi {

    private final CompetitionAssociationService associationService;
    private final CompetitionAssociationApiMapper mapper;

    @PreAuthorize("hasAuthority('SCOPE_create:competitions') and hasAuthority('SCOPE_update:competitions')")
    public ResponseEntity<CompetitionAssociationInternalResponse> addTeamToPool(
        Long poolId, Long teamId, String clubId) {
        return ResponseEntity.ok(mapper.toInternalResponse(
            associationService.addOrReactivateAssociation(poolId, teamId, clubId)));
    }

    public ResponseEntity<List<CompetitionAssociationInternalResponse>> listPoolTeams(Long poolId) {
        return ResponseEntity.ok(associationService.getActiveAssociationsByPool(poolId).stream()
            .map(mapper::toInternalResponse)
            .toList());
    }

    public ResponseEntity<List<CompetitionAssociationInternalResponse>> listAssociationsByTeam(Long teamId) {
        return ResponseEntity.ok(associationService.getActiveAssociationsByTeam(teamId).stream()
            .map(mapper::toInternalResponse)
            .toList());
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:competitions')")
    public ResponseEntity<Void> bulkDeactivateTeams(Long poolId, BulkDeactivateTeamsInternalRequest request) {
        associationService.bulkDeactivateTeamsByPool(poolId, request.getMissingTeamIds());
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:competitions')")
    public ResponseEntity<Void> bulkDeactivatePools(BulkDeactivatePoolsInternalRequest request) {
        associationService.bulkDeactivatePools(request.getMissingPoolIds());
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:competitions')")
    public ResponseEntity<Void> bulkDeactivateClubs(BulkDeactivateClubsInternalRequest request) {
        associationService.bulkDeactivateClubs(request.getMissingClubIds());
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_update:competitions')")
    public ResponseEntity<CompetitionAssociationInternalResponse> updateStats(
        Long poolId, Long teamId, UpdateAssociationStatsInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(
            associationService.updateTeamAssociationStats(poolId, teamId, mapper.toCommand(request))));
    }

    public ResponseEntity<List<PoolWithRankingInternalResponse>> getPoolsAndRankingsByTeam(Long teamId) {
        return ResponseEntity.ok(associationService.getPoolsAndRankingsByTeam(teamId).stream()
            .map(mapper::toInternalResponse)
            .toList());
    }
}
