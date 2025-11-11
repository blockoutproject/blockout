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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamService {

    private static final Logger logger = LoggerFactory.getLogger(TeamService.class);

    private final TeamClientService teamClientService;
    private final ConfigClientService configClientService;
    private final ClubClientService clubClientService;
    private final CompetitionClientService competitionClientService;
    private final PoolClientService poolClientService;

    public EnrichedTeamDTO getTeamById(Long id) {
        logger.info("Fetch team by id", keyValue("action", "get_team_by_id"), keyValue("team_id", id));

        TeamDTO team = teamClientService.getTeamById(id);
        if (team == null)
            throw new InconsistentStateException("Team not found with ID " + id);

        DivisionDTO division = configClientService.getDivisionById(team.getDivisionId());
        if (division == null)
            throw new InconsistentStateException("Division not found for team with ID " + id);

        List<PoolWithRankingDTO> poolsWithRankings = competitionClientService.getPoolsWithRankingByTeam(id);
        logger.info("Pools with ranking fetched",
                keyValue("action", "fetch_pools_with_ranking"),
                keyValue("team_id", id),
                keyValue("pools_count", poolsWithRankings != null ? poolsWithRankings.size() : 0));

        // Teams involved (including the team itself)
        Set<Long> allTeamIds = poolsWithRankings.stream()
                .flatMap(p -> p.getRanking().stream())
                .map(TeamRankingDTO::getTeamId)
                .collect(Collectors.toCollection(() -> new HashSet<>(64)));
        allTeamIds.add(id);

        Map<Long, TeamDTO> teamsMap = teamClientService.getTeamsByIds(allTeamIds).stream()
                .collect(Collectors.toMap(TeamDTO::getId, Function.identity()));

        // Collect all clubIds once
        Set<String> clubIds = teamsMap.values().stream()
                .map(TeamDTO::getClubId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, ClubDTO> clubMap = clubClientService.getClubsByIds(clubIds).stream()
                .collect(Collectors.toMap(ClubDTO::getId, Function.identity()));

        // Inject logo into TeamDTOs
        teamsMap.values().forEach(t -> {
            ClubDTO club = clubMap.get(t.getClubId());
            t.setLogoUrl(club != null ? club.getLogoUrl() : null);
        });

        // Fetch all pools once
        Set<Long> poolIds = poolsWithRankings.stream().map(PoolWithRankingDTO::getPoolId).collect(Collectors.toSet());
        Map<Long, PoolDTO> poolMap = poolClientService.getPoolsByIds(poolIds).stream()
                .collect(Collectors.toMap(PoolDTO::getId, Function.identity()));

        List<EnrichedPoolDTO> enrichedPools = poolsWithRankings.stream()
                .map(p -> {
                    PoolDTO basePool = poolMap.get(p.getPoolId());
                    if (basePool == null) {
                        throw new InconsistentStateException("Missing pool with ID " + p.getPoolId());
                    }
                    List<TeamWithStatsDTO> ranking = buildRanking(p.getRanking(), teamsMap);
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
                })
                .toList();

        ClubDTO enrichedClub = clubMap.get(team.getClubId());

        EnrichedTeamDTO result = EnrichedTeamDTO.builder()
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

        logger.info("Built enriched team",
                keyValue("action", "build_enriched_team"),
                keyValue("team_id", id),
                keyValue("pools_count", enrichedPools.size()),
                keyValue("club_set", enrichedClub != null));

        return result;
    }

    public List<TeamSummaryDTO> getTeamsByClubId(String clubId) {
        if (clubId == null || clubId.isBlank()) {
            throw new InconsistentStateException("clubId must be a non-empty string");
        }
        logger.info("Fetch teams by club",
                keyValue("action", "get_teams_by_club"),
                keyValue("club_id", clubId));

        List<TeamDTO> teams = teamClientService.getTeamsByClubId(clubId);
        if (teams == null || teams.isEmpty())
            return Collections.emptyList();

        // Divisions (dedup)
        Set<Long> divisionIds = teams.stream()
                .map(TeamDTO::getDivisionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, DivisionDTO> divisionById = new HashMap<>(divisionIds.size());
        for (Long divId : divisionIds) {
            DivisionDTO div = configClientService.getDivisionById(divId);
            if (div != null)
                divisionById.put(divId, div);
        }

        // Club (logo)
        Map<String, ClubDTO> clubById = clubClientService.getClubsByIds(Set.of(clubId)).stream()
                .collect(Collectors.toMap(ClubDTO::getId, c -> c));
        ClubDTO club = clubById.get(clubId);

        List<TeamSummaryDTO> result = teams.stream()
                .map(t -> TeamSummaryDTO.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .shortName(t.getShortName())
                        .format(t.getFormat())
                        .gender(t.getGender())
                        .season(t.getSeason())
                        .division(divisionById.get(t.getDivisionId()))
                        .club(club)
                        .build())
                .toList();

        logger.info("Built team summaries for club",
                keyValue("action", "build_team_summaries_for_club"),
                keyValue("club_id", clubId),
                keyValue("count", result.size()));

        return result;
    }

    public List<TeamSummaryDTO> getTeamsByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new InconsistentStateException("ids must be a non-empty list");
        }
        logger.info("Fetch teams by ids",
                keyValue("action", "get_teams_by_ids"),
                keyValue("ids_count", ids.size()));

        List<TeamDTO> teams = teamClientService.getTeamsByIds(Set.copyOf(ids));
        if (teams == null || teams.isEmpty())
            return Collections.emptyList();

        // Divisions
        Set<Long> divisionIds = teams.stream()
                .map(TeamDTO::getDivisionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, DivisionDTO> divisionById = new HashMap<>(divisionIds.size());
        for (Long divId : divisionIds) {
            DivisionDTO div = configClientService.getDivisionById(divId);
            if (div != null)
                divisionById.put(divId, div);
        }

        // Clubs
        Set<String> clubIds = teams.stream()
                .map(TeamDTO::getClubId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, ClubDTO> clubById = clubClientService.getClubsByIds(clubIds).stream()
                .collect(Collectors.toMap(ClubDTO::getId, c -> c));

        List<TeamSummaryDTO> result = teams.stream()
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

        logger.info("Built team summaries by ids",
                keyValue("action", "build_team_summaries_by_ids"),
                keyValue("requested_ids", ids.size()),
                keyValue("returned", result.size()));

        return result;
    }

    public TeamDTO updateTeam(Long id, TeamUpdateDTO dto) {
        logger.info("Update team",
                keyValue("action", "update_team"),
                keyValue("team_id", id),
                keyValue("has_payload", dto != null));
        return teamClientService.updateTeam(id, dto);
    }

    private static List<TeamWithStatsDTO> buildRanking(List<TeamRankingDTO> rawRanking, Map<Long, TeamDTO> teamsMap) {
        if (rawRanking == null || rawRanking.isEmpty())
            return Collections.emptyList();

        return rawRanking.stream()
                .map(r -> {
                    TeamDTO t = teamsMap.get(r.getTeamId());
                    if (t == null) {
                        throw new InconsistentStateException("Missing team with ID " + r.getTeamId());
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
                .sorted(
                        Comparator.comparingInt(TeamWithStatsDTO::getPoints).reversed()
                                .thenComparingInt(TeamWithStatsDTO::getPointsPenalty)
                                .thenComparing(Comparator.comparingInt(TeamWithStatsDTO::getWins).reversed())
                                .thenComparing(Comparator.comparingDouble(TeamWithStatsDTO::getCoefSets).reversed())
                                .thenComparing(Comparator.comparingDouble(TeamWithStatsDTO::getCoefPoints).reversed()))
                .toList();
    }
}