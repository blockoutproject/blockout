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
import com.blockout.mobilegateway.services.clients.*;

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

        DivisionDTO division = configClientService.getDivisionById(team.getDivisionId());
        if (division == null) {
            throw new InconsistentStateException("Division not found for team with ID " + teamId);
        }

        List<PoolWithRankingDTO> poolsWithRankings = competitionClientService.getPoolsWithRankingByTeam(teamId);

        // Récupérer tous les teamIds impliqués (y compris l’équipe elle-même)
        Set<Long> allTeamIds = poolsWithRankings.stream()
                .flatMap(p -> p.getRanking().stream())
                .map(TeamRankingDTO::getTeamId)
                .collect(Collectors.toSet());
        allTeamIds.add(teamId);

        Map<Long, TeamDTO> teamsMap = teamClientService.getTeamsByIds(allTeamIds).stream()
                .collect(Collectors.toMap(TeamDTO::getId, Function.identity()));

        // Collecte de tous les clubIds nécessaires
        Set<String> clubIds = teamsMap.values().stream()
                .map(TeamDTO::getClubId)
                .collect(Collectors.toSet());

        List<ClubDTO> clubs = clubClientService.getClubsByIds(clubIds);
        Map<String, ClubDTO> clubMap = clubs.stream()
                .collect(Collectors.toMap(ClubDTO::getId, Function.identity()));

        // Injection des logos dans les TeamDTO
        teamsMap.values().forEach(t -> {
            ClubDTO club = clubMap.get(t.getClubId());
            t.setLogoUrl(club.getLogoUrl());
        });

        // Récupérer tous les pools une seule fois
        Set<Long> poolIds = poolsWithRankings.stream()
                .map(PoolWithRankingDTO::getPoolId)
                .collect(Collectors.toSet());

        Map<Long, PoolDTO> poolMap = poolClientService.getPoolsByIds(poolIds).stream()
                .collect(Collectors.toMap(PoolDTO::getId, Function.identity()));

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
                                    throw new InconsistentStateException(
                                            "Missing team with ID " + r.getTeamId());
                                }
                                return TeamWithStatsDTO.builder()
                                        .id(t.getId())
                                        .name(t.getName())
                                        .shortName(t.getShortName())
                                        .logoUrl(t.getLogoUrl())
                                        .points(r.getPoints())
                                        .played(r.getPlayed())
                                        .wins(r.getWins())
                                        .losses(r.getLosses())
                                        .pointsPenalty(r.getPointsPenalty())
                                        .coefSets(r.getCoefSets())
                                        .coefPoints(r.getCoefPoints())
                                        .build();
                            })
                            .filter(Objects::nonNull)
                            .sorted(
                                    Comparator.comparingInt(TeamWithStatsDTO::getPoints).reversed()
                                            .thenComparingInt(TeamWithStatsDTO::getPointsPenalty)
                                            .thenComparing(
                                                    Comparator.comparingInt(TeamWithStatsDTO::getWins).reversed())
                                            .thenComparing(Comparator.comparingDouble(TeamWithStatsDTO::getCoefSets)
                                                    .reversed())
                                            .thenComparing(Comparator.comparingDouble(TeamWithStatsDTO::getCoefPoints)
                                                    .reversed()))
                            .toList();

                    return EnrichedPoolDTO.builder()
                            .id(basePool.getId())
                            .leagueCode(basePool.getLeagueCode())
                            .leagueName(basePool.getLeagueName())
                            .name(basePool.getName())
                            .format(basePool.getFormat())
                            .gender(basePool.getGender())
                            .followersCount(basePool.getFollowersCount())
                            .division(division)
                            .ranking(ranking)
                            .build();
                }).toList();

        ClubDTO enrichedClub = clubMap.get(team.getClubId());

        return EnrichedTeamDTO.builder()
                .id(team.getId())
                .name(team.getName())
                .shortName(team.getShortName())
                .format(team.getFormat())
                .gender(team.getGender())
                .season(team.getSeason())
                .followersCount(team.getFollowersCount())
                .division(division)
                .club(enrichedClub)
                .pools(enrichedPools)
                .build();
    }
}