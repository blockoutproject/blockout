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
import org.springframework.web.multipart.MultipartFile;
import org.apache.commons.lang3.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;
import static com.blockout.mobilegateway.utils.TeamLogoEnricher.enrichTeamsWithClubLogo;

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
        long t0 = System.nanoTime();
        logger.info("Fetch team by id",
                keyValue("action", "get_team_by_id"),
                keyValue("team_id", id));

        TeamDTO team = teamClientService.getTeamById(id);
        if (team == null) {
            throw new InconsistentStateException("Team not found with ID " + id);
        }

        DivisionDTO division = configClientService.getDivisionById(team.getDivisionId());
        if (division == null) {
            throw new InconsistentStateException("Division not found for team with ID " + id);
        }

        List<PoolWithRankingDTO> poolsWithRankings = competitionClientService.getPoolsWithRankingByTeam(id);
        logger.debug("Pools with ranking fetched",
                keyValue("action", "fetch_pools_with_ranking"),
                keyValue("team_id", id),
                keyValue("pools_count", poolsWithRankings != null ? poolsWithRankings.size() : 0));

        Set<Long> allTeamIds = poolsWithRankings.stream()
                .flatMap(p -> p.getRanking().stream())
                .map(TeamRankingDTO::getTeamId)
                .collect(Collectors.toCollection(() -> new HashSet<>(64)));
        allTeamIds.add(id);

        Map<Long, TeamDTO> teamsMap = new HashMap<>(allTeamIds.size() * 2);
        for (Long teamId : allTeamIds) {
            TeamDTO t = teamClientService.getTeamById(teamId);
            if (t != null) {
                teamsMap.put(teamId, t);
            } else {
                logger.warn("Missing team while building enriched team",
                        keyValue("team_id", teamId),
                        keyValue("main_team_id", id));
            }
        }

        enrichTeamsWithClubLogo(teamsMap.values(), clubClientService);

        Set<Long> poolIds = poolsWithRankings.stream()
                .map(PoolWithRankingDTO::getPoolId)
                .collect(Collectors.toSet());

        Map<Long, PoolDTO> poolMap = new HashMap<>(poolIds.size() * 2);
        for (Long poolId : poolIds) {
            PoolDTO pool = poolClientService.getPoolById(poolId);
            if (pool != null) {
                poolMap.put(poolId, pool);
            } else {
                logger.warn("Missing pool while building enriched team",
                        keyValue("pool_id", poolId),
                        keyValue("team_id", id));
            }
        }

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

        ClubDTO club = clubClientService.getClubById(team.getClubId());

        String finalLogoUrl = StringUtils.isNotBlank(team.getLogoUrl())
                ? team.getLogoUrl()
                : (club != null ? club.getLogoUrl() : null);

        EnrichedTeamDTO result = EnrichedTeamDTO.builder()
                .id(team.getId())
                .name(team.getName())
                .clubId(team.getClubId())
                .shortName(team.getShortName())
                .rawName(team.getRawName())
                .format(team.getFormat())
                .gender(team.getGender())
                .season(team.getSeason())
                .followersCount(team.getFollowersCount())
                .logoUrl(finalLogoUrl)
                .club(club) // TODO: Virer apres passage à la 1.1.0
                .division(division)
                .pools(enrichedPools)
                .build();

        long t1 = System.nanoTime();
        logger.info("Built enriched team",
                keyValue("action", "build_enriched_team"),
                keyValue("team_id", id),
                keyValue("pools_count", enrichedPools.size()),
                keyValue("club_set", club != null),
                keyValue("duration_ms", (t1 - t0) / 1_000_000));

        return result;
    }

    public List<TeamSummaryDTO> getTeamsByClubId(String clubId) {
        if (StringUtils.isBlank(clubId)) {
            throw new InconsistentStateException("clubId must be a non-empty string");
        }
        long t0 = System.nanoTime();
        logger.info("Fetch teams by club",
                keyValue("action", "get_teams_by_club"),
                keyValue("club_id", clubId));

        List<TeamDTO> teams = teamClientService.getTeamsByClubId(clubId);
        if (teams == null || teams.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Long> divisionIds = teams.stream()
                .map(TeamDTO::getDivisionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, DivisionDTO> divisionsById = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            DivisionDTO division = configClientService.getDivisionById(divisionId);
            if (division != null) {
                divisionsById.put(divisionId, division);
            } else {
                logger.warn("Division not found while building team summaries for club",
                        keyValue("division_id", divisionId),
                        keyValue("club_id", clubId));
            }
        }

        ClubDTO club = clubClientService.getClubById(clubId);

        List<TeamSummaryDTO> result = teams.stream()
                .map(t -> {
                    String finalLogoUrl = StringUtils.isNotBlank(t.getLogoUrl())
                            ? t.getLogoUrl()
                            : club.getLogoUrl();

                    return TeamSummaryDTO.builder()
                            .id(t.getId())
                            .name(t.getName())
                            .shortName(t.getShortName())
                            .format(t.getFormat())
                            .gender(t.getGender())
                            .season(t.getSeason())
                            .club(club) // TODO: à enlever
                            .division(divisionsById.get(t.getDivisionId()))
                            .logoUrl(finalLogoUrl)
                            .build();
                })
                .toList();

        long t1 = System.nanoTime();
        logger.info("Built team summaries for club",
                keyValue("action", "build_team_summaries_for_club"),
                keyValue("club_id", clubId),
                keyValue("count", result.size()),
                keyValue("duration_ms", (t1 - t0) / 1_000_000));

        return result;
    }

    public List<TeamSummaryDTO> getTeamsByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new InconsistentStateException("ids must be a non-empty list");
        }
        long t0 = System.nanoTime();
        logger.info("Fetch teams by ids",
                keyValue("action", "get_teams_by_ids"),
                keyValue("ids_count", ids.size()));

        Set<Long> uniqueIds = new HashSet<>(ids);
        List<TeamDTO> teams = new ArrayList<>(uniqueIds.size());
        for (Long teamId : uniqueIds) {
            TeamDTO team = teamClientService.getTeamById(teamId);
            if (team != null && team.getActive()) {
                teams.add(team);
            } else {
                logger.warn("Team not found while building team summaries by ids",
                        keyValue("team_id", teamId));
            }
        }

        if (teams.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Long> divisionIds = teams.stream()
                .map(TeamDTO::getDivisionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, DivisionDTO> divisionsById = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            DivisionDTO division = configClientService.getDivisionById(divisionId);
            if (division != null) {
                divisionsById.put(divisionId, division);
            } else {
                logger.warn("Division not found while building team summaries by ids",
                        keyValue("division_id", divisionId));
            }
        }

        Set<String> clubIds = teams.stream()
                .map(TeamDTO::getClubId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, ClubDTO> clubById = new HashMap<>(clubIds.size() * 2);
        for (String clubId : clubIds) {
            ClubDTO club = clubClientService.getClubById(clubId);
            if (club != null) {
                clubById.put(clubId, club);
            } else {
                logger.warn("Club not found while building team summaries by ids",
                        keyValue("club_id", clubId));
            }
        }

        List<TeamSummaryDTO> result = teams.stream()
                .map(t -> {
                    ClubDTO club = clubById.get(t.getClubId());

                    String finalLogoUrl = StringUtils.isNotBlank(t.getLogoUrl())
                            ? t.getLogoUrl()
                            : (club != null ? club.getLogoUrl() : null);

                    return TeamSummaryDTO.builder()
                            .id(t.getId())
                            .name(t.getName())
                            .shortName(t.getShortName())
                            .format(t.getFormat())
                            .gender(t.getGender())
                            .season(t.getSeason())
                            .logoUrl(finalLogoUrl)
                            .club(club) // TODO: a enlever
                            .division(divisionsById.get(t.getDivisionId()))
                            .build();
                })
                .toList();

        long t1 = System.nanoTime();
        logger.info("Built team summaries by ids",
                keyValue("action", "build_team_summaries_by_ids"),
                keyValue("requested_ids", ids.size()),
                keyValue("returned", result.size()),
                keyValue("duration_ms", (t1 - t0) / 1_000_000));

        return result;
    }

    public TeamDTO updateTeam(Long id, TeamUpdateDTO dto, MultipartFile image) {
        logger.info("Update team",
                keyValue("action", "update_team"),
                keyValue("team_id", id),
                keyValue("has_payload", dto != null),
                keyValue("has_image", image != null));
        return teamClientService.updateTeam(id, dto, image);
    }

    private static List<TeamWithStatsDTO> buildRanking(List<TeamRankingDTO> rawRanking, Map<Long, TeamDTO> teamsMap) {
        if (rawRanking == null || rawRanking.isEmpty()) {
            return Collections.emptyList();
        }

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