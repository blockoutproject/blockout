package com.blockout.competitions.association.api.v1;

import com.blockout.competitions.association.application.AddCompetitionAssociationCommand;
import com.blockout.competitions.association.application.CompetitionAssociationService;
import com.blockout.competitions.association.application.CompetitionAssociationView;
import com.blockout.competitions.association.application.CompetitionStatisticsSnapshot;
import com.blockout.competitions.lifecycle.application.CompetitionLifecycleService;
import com.blockout.competitions.models.dto.PoolWithRankingDTO;
import com.blockout.competitions.ranking.application.CompetitionRankingService;
import com.blockout.competitions.shared.api.v1.LegacyCompetitionJson;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
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

@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/competitions", produces = MediaType.APPLICATION_JSON_VALUE)
public class LegacyCompetitionController {

    private final CompetitionAssociationService associations;
    private final CompetitionLifecycleService lifecycle;
    private final CompetitionRankingService rankings;
    private final LegacyCompetitionJson json;

    @PostMapping("/pools/{poolId}/teams/{teamId}")
    @PreAuthorize("hasAuthority('SCOPE_create:competitions') and hasAuthority('SCOPE_update:competitions')")
    public ResponseEntity<String> addTeamToPool(
            @PathVariable Long poolId,
            @PathVariable Long teamId,
            @RequestParam(name = "club_id") String clubId) throws JsonProcessingException {
        CompetitionAssociationView saved = associations.addOrReactivate(
                new AddCompetitionAssociationCommand(poolId, teamId, clubId));
        return ResponseEntity.ok(json.write(response(saved)));
    }

    @GetMapping("/pools/{poolId}/teams")
    public ResponseEntity<String> listPoolTeams(@PathVariable Long poolId) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(associations.findLegacyByPool(poolId).stream()
                .map(this::response).toList()));
    }

    @GetMapping("/teams/{teamId}/pools")
    public ResponseEntity<String> listAssociationsByTeam(@PathVariable Long teamId) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(associations.findLegacyByTeam(teamId).stream()
                .map(this::response).toList()));
    }

    @PutMapping("/pools/{poolId}/teams/bulk-deactivate")
    @PreAuthorize("hasAuthority('SCOPE_delete:competitions')")
    public ResponseEntity<Void> bulkDeactivateTeams(
            @PathVariable Long poolId, @RequestBody String body) throws JsonProcessingException {
        lifecycle.bulkDeactivateTeamsByPool(poolId, json.read(body, MissingTeamIdsRequest.class).missingTeamIds());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/pools/bulk-deactivate")
    @PreAuthorize("hasAuthority('SCOPE_delete:competitions')")
    public ResponseEntity<Void> bulkDeactivatePools(@RequestBody String body) throws JsonProcessingException {
        lifecycle.bulkDeactivatePools(json.read(body, MissingPoolIdsRequest.class).missingPoolIds());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/clubs/bulk-deactivate")
    @PreAuthorize("hasAuthority('SCOPE_delete:competitions')")
    public ResponseEntity<Void> bulkDeactivateClubs(@RequestBody String body) throws JsonProcessingException {
        lifecycle.bulkDeactivateClubs(json.read(body, MissingClubIdsRequest.class).missingClubIds());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/pools/{poolId}/teams/{teamId}/stats")
    @PreAuthorize("hasAuthority('SCOPE_update:competitions')")
    public ResponseEntity<String> updateStats(
            @PathVariable Long poolId, @PathVariable Long teamId, @RequestBody String body)
            throws JsonProcessingException {
        LegacyStatisticsRequest request = json.read(body, LegacyStatisticsRequest.class);
        CompetitionAssociationView updated = associations.replaceStatistics(poolId, teamId, request.snapshot());
        return ResponseEntity.ok(json.write(response(updated)));
    }

    @GetMapping("/teams/{teamId}/pools-with-ranking")
    public ResponseEntity<String> getPoolsAndRankingsByTeam(@PathVariable Long teamId) throws JsonProcessingException {
        List<PoolWithRankingDTO> result = rankings.getPoolsAndRankingsByTeam(teamId);
        return ResponseEntity.ok(json.write(result));
    }

    private LegacyCompetitionAssociationResponse response(CompetitionAssociationView view) {
        return new LegacyCompetitionAssociationResponse(
                view.id(), view.poolId(), view.teamId(), view.clubId(), view.active(), view.points(), view.played(),
                view.wins(), view.losses(), view.winsThreeToZero(), view.winsThreeToOne(), view.winsThreeToTwo(),
                view.lossesZeroToThree(), view.lossesOneToThree(), view.lossesTwoToThree(), view.wonSets(),
                view.lostSets(), view.wonPoints(), view.lostPoints(), view.pointsPenalty(), view.coefSets(),
                view.coefPoints(), view.createdAt(), view.lastUpdate());
    }

    record MissingTeamIdsRequest(List<Long> missingTeamIds) {
    }

    record MissingPoolIdsRequest(List<Long> missingPoolIds) {
    }

    record MissingClubIdsRequest(List<String> missingClubIds) {
    }

    record LegacyStatisticsRequest(
            Integer played,
            Integer wins,
            Integer losses,
            Integer points,
            Integer winsThreeToZero,
            Integer winsThreeToOne,
            Integer winsThreeToTwo,
            Integer lossesZeroToThree,
            Integer lossesOneToThree,
            Integer lossesTwoToThree,
            Integer wonSets,
            Integer lostSets,
            Integer wonPoints,
            Integer lostPoints,
            Integer pointsPenalty,
            Double coefSets,
            Double coefPoints) {

        CompetitionStatisticsSnapshot snapshot() {
            return new CompetitionStatisticsSnapshot(played, wins, losses, points, winsThreeToZero, winsThreeToOne,
                    winsThreeToTwo, lossesZeroToThree, lossesOneToThree, lossesTwoToThree, wonSets, lostSets,
                    wonPoints, lostPoints, pointsPenalty, coefSets, coefPoints);
        }
    }

    record LegacyCompetitionAssociationResponse(
            Long id,
            Long poolId,
            Long teamId,
            String clubId,
            Boolean active,
            Integer points,
            Integer played,
            Integer wins,
            Integer losses,
            Integer winsThreeToZero,
            Integer winsThreeToOne,
            Integer winsThreeToTwo,
            Integer lossesZeroToThree,
            Integer lossesOneToThree,
            Integer lossesTwoToThree,
            Integer wonSets,
            Integer lostSets,
            Integer wonPoints,
            Integer lostPoints,
            Integer pointsPenalty,
            Double coefSets,
            Double coefPoints,
            LocalDateTime createdAt,
            LocalDateTime lastUpdate) {
    }
}
