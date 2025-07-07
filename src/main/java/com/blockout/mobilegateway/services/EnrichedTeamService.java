package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.models.dto.competition.CompetitionAssociationDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.team.EnrichedTeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamWithStatsDTO;
import com.blockout.mobilegateway.services.clients.CompetitionClientService;
import com.blockout.mobilegateway.services.clients.ConfigClientService;
import com.blockout.mobilegateway.services.clients.PoolClientService;
import com.blockout.mobilegateway.services.clients.TeamClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnrichedTeamService {

    private final TeamClientService teamClientService;
    private final ConfigClientService configClientService;
    private final CompetitionClientService competitionClientService;
    private final PoolClientService poolClientService;

    public EnrichedTeamDTO getEnrichedTeamById(Long teamId) {
        TeamDTO team = teamClientService.getTeamById(teamId);
        DivisionDTO division = configClientService.getDivisionById(team.getDivisionId());

        List<CompetitionAssociationDTO> poolAssocs = competitionClientService.getActiveAssociationsByTeam(teamId);
        Set<Long> poolIds = poolAssocs.stream().map(CompetitionAssociationDTO::getPoolId).collect(Collectors.toSet());
        List<PoolDTO> rawPools = poolClientService.getPoolsByIds(poolIds);

        // Map des pools
        Map<Long, PoolDTO> poolMap = rawPools.stream()
            .collect(Collectors.toMap(PoolDTO::getId, Function.identity()));

        // Groupement des associations par pool
        Map<Long, List<CompetitionAssociationDTO>> poolToAssocs = poolAssocs.stream()
            .collect(Collectors.groupingBy(CompetitionAssociationDTO::getPoolId));

        // Tous les teamIds impliqués
        Set<Long> teamIds = poolAssocs.stream().map(CompetitionAssociationDTO::getTeamId).collect(Collectors.toSet());
        Map<Long, TeamDTO> teamsMap = teamClientService.getTeamsByIds(teamIds).stream()
            .collect(Collectors.toMap(TeamDTO::getId, Function.identity()));

        // Construction des pools enrichies (sans division)
        List<EnrichedPoolDTO> enrichedPools = new ArrayList<>();
        for (Map.Entry<Long, List<CompetitionAssociationDTO>> entry : poolToAssocs.entrySet()) {
            Long poolId = entry.getKey();
            PoolDTO basePool = poolMap.get(poolId);
            if (basePool == null) {
                throw new InconsistentStateException("Missing pool with ID " + poolId + " for team " + teamId);
            }

            List<TeamWithStatsDTO> ranking = entry.getValue().stream()
                .map(assoc -> {
                    TeamDTO t = teamsMap.get(assoc.getTeamId());
                    if (t == null) {
                        throw new InconsistentStateException("Missing team with ID " + assoc.getTeamId() + " in pool " + poolId);
                    }
                    return TeamWithStatsDTO.builder()
                            .id(t.getId())
                            .name(t.getName())
                            .shortName(t.getShortName())
                            .format(t.getFormat())
                            .gender(t.getGender())
                            .followersCount(t.getFollowersCount())
                            .points(assoc.getPoints())
                            .played(assoc.getPlayed())
                            .wins(assoc.getWins())
                            .losses(assoc.getLosses())
                            .pointsPenalty(assoc.getPointsPenalty())
                            .coefSets(assoc.getCoefSets())
                            .coefPoints(assoc.getCoefPoints())
                            .build();
                })
                .sorted(
                        Comparator.comparingInt(TeamWithStatsDTO::getPoints).reversed()
                                .thenComparingInt(TeamWithStatsDTO::getPointsPenalty)
                                .thenComparingInt(TeamWithStatsDTO::getWins).reversed()
                                .thenComparingDouble(TeamWithStatsDTO::getCoefSets).reversed()
                                .thenComparingDouble(TeamWithStatsDTO::getCoefPoints).reversed())
                .toList();

            EnrichedPoolDTO enrichedPool = EnrichedPoolDTO.builder()
                    .id(basePool.getId())
                    .season(basePool.getSeason())
                    .leagueName(basePool.getLeagueName())
                    .name(basePool.getName())
                    .format(basePool.getFormat())
                    .gender(basePool.getGender())
                    .followersCount(basePool.getFollowersCount())
                    .ranking(ranking)
                    .build();

            enrichedPools.add(enrichedPool);
        }

        return EnrichedTeamDTO.builder()
                .id(team.getId())
                .clubId(team.getClubId())
                .name(team.getName())
                .shortName(team.getShortName())
                .leagueCode(team.getLeagueCode())
                .format(team.getFormat())
                .gender(team.getGender())
                .followersCount(team.getFollowersCount())
                .division(division)
                .pools(enrichedPools)
                .build();
    }
}