package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.competition.PoolWithRankingDTO;
import com.blockout.mobilegateway.models.dto.competition.TeamRankingDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.team.EnrichedTeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamWithStatsDTO;
import com.blockout.mobilegateway.services.clients.ClubClientService;
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
    private final ClubClientService clubClientService;

    public EnrichedTeamDTO getEnrichedTeamById(Long teamId) {
        TeamDTO team = teamClientService.getTeamById(teamId);

        ClubDTO club = clubClientService.getClubById(team.getClubId());

        if (club == null) {
            throw new InconsistentStateException("Club not found for team with ID " + teamId);
        }

        team.setLogoUrl(club.getLogoUrl());
        
        DivisionDTO division = configClientService.getDivisionById(team.getDivisionId());

        if (division == null) {
            throw new InconsistentStateException("Division not found for team with ID " + teamId);
        }

        List<PoolWithRankingDTO> poolsWithRankings = competitionClientService.getPoolsWithRankingByTeam(teamId);

        // Récupérer tous les teamIds impliqués
        Set<Long> allTeamIds = poolsWithRankings.stream()
                .flatMap(p -> p.getRanking().stream())
                .map(TeamRankingDTO::getTeamId)
                .collect(Collectors.toSet());

        // Récupérer toutes les équipes une seule fois
        Map<Long, TeamDTO> teamsMap = teamClientService.getTeamsByIds(allTeamIds).stream()
                .collect(Collectors.toMap(TeamDTO::getId, Function.identity()));

        // Récupérer tous les pools une seule fois
        Set<Long> poolIds = poolsWithRankings.stream()
                .map(PoolWithRankingDTO::getPoolId)
                .collect(Collectors.toSet());

        Map<Long, PoolDTO> poolMap = poolClientService.getPoolsByIds(poolIds).stream()
                .collect(Collectors.toMap(PoolDTO::getId, Function.identity()));

        // Mapper les EnrichedPoolDTO
        List<EnrichedPoolDTO> enrichedPools = poolsWithRankings.stream()
                .map(p -> {
                    PoolDTO basePool = poolMap.get(p.getPoolId());
                    if (basePool == null) {
                        throw new InconsistentStateException("Missing pool with ID " + p.getPoolId());
                    }

                    List<TeamWithStatsDTO> ranking = p.getRanking().stream()
                            .map(r -> {
                                TeamDTO t = teamsMap.get(r.getTeamId());
                                if (t == null) {
                                    throw new InconsistentStateException("Missing team with ID " + r.getTeamId());
                                }
                                return TeamWithStatsDTO.builder()
                                        .id(t.getId())
                                        .name(t.getName())
                                        .shortName(t.getShortName())
                                        .format(t.getFormat())
                                        .gender(t.getGender())
                                        .followersCount(t.getFollowersCount())
                                        .points(r.getPoints())
                                        .played(r.getPlayed())
                                        .wins(r.getWins())
                                        .losses(r.getLosses())
                                        .pointsPenalty(r.getPointsPenalty())
                                        .coefSets(r.getCoefSets())
                                        .coefPoints(r.getCoefPoints())
                                        .build();
                            }).toList();

                    return EnrichedPoolDTO.builder()
                            .id(basePool.getId())
                            .season(basePool.getSeason())
                            .leagueName(basePool.getLeagueName())
                            .name(basePool.getName())
                            .format(basePool.getFormat())
                            .gender(basePool.getGender())
                            .followersCount(basePool.getFollowersCount())
                            .division(division)
                            .ranking(ranking)
                            .build();
                }).toList();

        return EnrichedTeamDTO.builder()
                .id(team.getId())
                .name(team.getName())
                .shortName(team.getShortName())
                .format(team.getFormat())
                .gender(team.getGender())
                .followersCount(team.getFollowersCount())
                .division(division)
                .pools(enrichedPools)
                .build();
    }
}