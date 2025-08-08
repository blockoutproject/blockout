package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.competition.CompetitionAssociationDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
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
public class EnrichedPoolService {

    private final PoolClientService poolClientService;
    private final ConfigClientService configClientService;
    private final CompetitionClientService competitionClientService;
    private final TeamClientService teamClientService;
    private final ClubClientService clubClientService;

    public EnrichedPoolDTO getEnrichedPoolById(Long poolId) {
        PoolDTO rawPool = poolClientService.getPoolById(poolId);

        if (rawPool == null) {
            throw new InconsistentStateException("Pool not found with ID " + poolId);
        }

        DivisionDTO division = configClientService.getDivisionById(rawPool.getDivisionId());

        if (division == null) {
            throw new InconsistentStateException("Division not found for pool with ID " + poolId);
        }

        // Récupération des associations actives pour cette pool
        List<CompetitionAssociationDTO> associations = competitionClientService.getActiveAssociationsByPool(poolId);

        // Récupération des teams nécessaires
        Set<Long> teamIds = associations.stream().map(CompetitionAssociationDTO::getTeamId).collect(Collectors.toSet());

        Map<Long, TeamDTO> teamsMap = teamClientService.getTeamsByIds(teamIds).stream()
                .collect(Collectors.toMap(TeamDTO::getId, Function.identity()));

        // Collecte de tous les clubIds nécessaires
        Set<String> clubIds = teamsMap.values().stream()
                .map(TeamDTO::getClubId)
                .collect(Collectors.toSet());

        // Fetch des clubs en une seule requête
        List<ClubDTO> clubs = clubClientService.getClubsByIds(clubIds);

        Map<String, String> clubLogoMap = new HashMap<>();
        for (ClubDTO club : clubs) {
            clubLogoMap.put(club.getId(), club.getLogoUrl());
        }

        // Injection des logos dans les TeamDTO
        teamsMap.values().forEach(team -> {
            String logo = clubLogoMap.get(team.getClubId());
            team.setLogoUrl(logo);
        });

        // Construction du classement des équipes
        List<TeamWithStatsDTO> ranking = associations.stream()
                .map(assoc -> {
                    TeamDTO team = teamsMap.get(assoc.getTeamId());
                    if (team == null) {
                        throw new InconsistentStateException(
                                "Missing team with ID " + assoc.getTeamId() + " for pool " + poolId);
                    }
                    ;

                    return TeamWithStatsDTO.builder()
                            .id(team.getId())
                            .name(team.getName())
                            .shortName(team.getShortName())
                            .logoUrl(team.getLogoUrl())
                            .points(assoc.getPoints())
                            .played(assoc.getPlayed())
                            .wins(assoc.getWins())
                            .losses(assoc.getLosses())
                            .pointsPenalty(assoc.getPointsPenalty())
                            .coefSets(assoc.getCoefSets())
                            .coefPoints(assoc.getCoefPoints())
                            .build();
                })
                .filter(Objects::nonNull)
                .sorted(
                        Comparator.comparingInt(TeamWithStatsDTO::getPoints)
                                .thenComparingInt(TeamWithStatsDTO::getPointsPenalty).reversed()
                                .thenComparingInt(TeamWithStatsDTO::getWins)
                                .thenComparingDouble(TeamWithStatsDTO::getCoefSets)
                                .thenComparingDouble(TeamWithStatsDTO::getCoefPoints))
                .toList();

        // Construction de l'objet enrichi
        return EnrichedPoolDTO.builder()
                .id(rawPool.getId())
                .season(rawPool.getSeason())
                .leagueName(rawPool.getLeagueName())
                .name(rawPool.getName())
                .division(division)
                .format(rawPool.getFormat())
                .gender(rawPool.getGender())
                .followersCount(rawPool.getFollowersCount())
                .ranking(ranking)
                .build();
    }
}