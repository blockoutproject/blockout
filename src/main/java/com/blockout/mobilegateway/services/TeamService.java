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
import com.blockout.mobilegateway.models.dto.team.TeamSummaryDTO;
import com.blockout.mobilegateway.models.dto.team.TeamUpdateDTO;
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
import java.util.logging.Logger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

    private static final Logger logger = Logger.getLogger(TeamService.class.getName());

    private final TeamClientService teamClientService;
    private final ConfigClientService configClientService;
    private final ClubClientService clubClientService;
    private final CompetitionClientService competitionClientService;
    private final PoolClientService poolClientService;

    public EnrichedTeamDTO getTeamById(Long id) {
        TeamDTO team = teamClientService.getTeamById(id);

        DivisionDTO division = configClientService.getDivisionById(team.getDivisionId());
        if (division == null) {
            throw new InconsistentStateException("Division not found for team with ID " + id);
        }

        List<PoolWithRankingDTO> poolsWithRankings = competitionClientService.getPoolsWithRankingByTeam(id);

        // Récupérer tous les teamIds impliqués (y compris l’équipe elle-même)
        Set<Long> allTeamIds = poolsWithRankings.stream()
                .flatMap(p -> p.getRanking().stream())
                .map(TeamRankingDTO::getTeamId)
                .collect(Collectors.toSet());
        allTeamIds.add(id);

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
                            .poolCode(basePool.getPoolCode())
                            .name(basePool.getName())
                            .shortName(basePool.getShortName())
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

    /**
     * Retourne une liste d’équipes “light” pour un club donné.
     * Champs renvoyés: id, name, shortName, format, gender, season, division, club
     * (pour le logo).
     */
    public List<TeamSummaryDTO> getTeamsByClubId(String clubId) {
        if (clubId == null || clubId.isBlank()) {
            throw new InconsistentStateException("clubId must be a non-empty string");
        }

        // 1) Récupérer les équipes du club (Team API)
        List<TeamDTO> teams = teamClientService.getTeamsByClubId(clubId);
        if (teams == null || teams.isEmpty()) {
            return Collections.emptyList();
        }

        // 2) Préparer les divisions (éviter les appels en doublon)
        Set<Long> divisionIds = teams.stream()
                .map(TeamDTO::getDivisionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, DivisionDTO> divisionById = new HashMap<>();
        for (Long divId : divisionIds) {
            DivisionDTO div = configClientService.getDivisionById(divId);
            if (div != null) {
                divisionById.put(divId, div);
            }
        }

        // 3) Récupérer le club pour le logo (Club API)
        // On utilise la méthode batch existante pour rester cohérent avec tes clients
        Map<String, ClubDTO> clubById = clubClientService.getClubsByIds(Set.of(clubId))
                .stream()
                .collect(Collectors.toMap(ClubDTO::getId, c -> c));

        ClubDTO club = clubById.get(clubId);
        // club peut être null si l'API Club ne trouve rien, on renverra alors club=null

        // 4) Map -> TeamSummaryDTO
        return teams.stream()
                .map(t -> TeamSummaryDTO.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .shortName(t.getShortName())
                        .format(t.getFormat())
                        .gender(t.getGender())
                        .season(t.getSeason())
                        .division(divisionById.get(t.getDivisionId()))
                        .club(club) // contient le logoUrl attendu
                        .build())
                .toList();
    }

    /**
     * Retourne une liste d’équipes “light” par leurs IDs.
     * Champs renvoyés: id, name, shortName, format, gender, season, division, club
     * (pour le logo).
     */
    public List<TeamSummaryDTO> getTeamsByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new InconsistentStateException("ids must be a non-empty list");
        }

        // 1) Récupérer les équipes
        List<TeamDTO> teams = teamClientService.getTeamsByIds(Set.copyOf(ids));
        if (teams == null || teams.isEmpty()) {
            return Collections.emptyList();
        }

        // 2) Préparer les divisions
        Set<Long> divisionIds = teams.stream()
                .map(TeamDTO::getDivisionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, DivisionDTO> divisionById = new HashMap<>();
        for (Long divId : divisionIds) {
            DivisionDTO div = configClientService.getDivisionById(divId);
            if (div != null) {
                divisionById.put(divId, div);
            }
        }

        // 3) Récupérer les clubs liés aux équipes
        Set<String> clubIds = teams.stream()
                .map(TeamDTO::getClubId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, ClubDTO> clubById = clubClientService.getClubsByIds(clubIds)
                .stream()
                .collect(Collectors.toMap(ClubDTO::getId, c -> c));

        // 4) Mapper vers le DTO final
        return teams.stream()
                .map(t -> TeamSummaryDTO.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .shortName(t.getShortName())
                        .format(t.getFormat())
                        .gender(t.getGender())
                        .season(t.getSeason())
                        .division(divisionById.get(t.getDivisionId()))
                        .club(clubById.get(t.getClubId()))
                        .build())
                .toList();
    }

    public TeamDTO updateTeam(Long id, TeamUpdateDTO dto) {
        logger.info("Updating team with id: " + id);
        return teamClientService.updateTeam(id, dto);
    }
}