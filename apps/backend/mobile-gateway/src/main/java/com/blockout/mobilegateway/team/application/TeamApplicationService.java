package com.blockout.mobilegateway.team.application;

import com.blockout.mobilegateway.club.api.models.ClubResponse;
import com.blockout.mobilegateway.club.infrastructure.ClubInternalClient;
import com.blockout.mobilegateway.competition.infrastructure.competition.CompetitionInternalClient;
import com.blockout.mobilegateway.competition.infrastructure.competition.models.PoolWithRankingInternalResponse;
import com.blockout.mobilegateway.competition.infrastructure.competition.models.TeamRankingInternalResponse;
import com.blockout.mobilegateway.config.api.models.DivisionResponse;
import com.blockout.mobilegateway.config.infrastructure.ConfigInternalClient;
import com.blockout.mobilegateway.pool.api.models.PoolInternalResponse;
import com.blockout.mobilegateway.pool.api.models.PoolResponse;
import com.blockout.mobilegateway.pool.infrastructure.PoolInternalClient;
import com.blockout.mobilegateway.shared.api.errors.InconsistentStateException;
import com.blockout.mobilegateway.team.api.models.*;
import com.blockout.mobilegateway.team.infrastructure.TeamInternalClient;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

import static com.blockout.mobilegateway.team.application.TeamLogoEnricher.enrichTeamsWithClubData;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(TeamApplicationService.class);

    private final TeamInternalClient teamInternalClient;
    private final ConfigInternalClient configInternalClient;
    private final ClubInternalClient clubInternalClient;
    private final CompetitionInternalClient competitionInternalClient;
    private final PoolInternalClient poolInternalClient;

    private static List<TeamWithStatsResponse> buildRanking(List<TeamRankingInternalResponse> rawRanking, Map<Long, TeamInternalResponse> teamsMap) {
        if (rawRanking == null || rawRanking.isEmpty()) {
            return Collections.emptyList();
        }

        return rawRanking.stream()
            .map(r -> {
                TeamInternalResponse t = teamsMap.get(r.getTeamId());
                if (t == null) {
                    throw new InconsistentStateException("Missing team with ID " + r.getTeamId());
                }
                return TeamWithStatsResponse.builder()
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
                Comparator.comparingInt(TeamWithStatsResponse::getPoints).reversed()
                    .thenComparingInt(TeamWithStatsResponse::getPointsPenalty)
                    .thenComparing(Comparator.comparingInt(TeamWithStatsResponse::getWins).reversed())
                    .thenComparing(Comparator.comparingDouble(TeamWithStatsResponse::getCoefSets).reversed())
                    .thenComparing(Comparator.comparingDouble(TeamWithStatsResponse::getCoefPoints).reversed()))
            .toList();
    }

    public TeamResponse getTeamById(Long id) {
        long t0 = System.nanoTime();
        logger.info("Fetch team by id",
            keyValue("action", "get_team_by_id"),
            keyValue("team_id", id));

        TeamInternalResponse team = teamInternalClient.getTeamById(id);
        if (team == null) {
            throw new InconsistentStateException("Team not found with ID " + id);
        }

        DivisionResponse division = configInternalClient.getDivisionById(team.getDivisionId());
        if (division == null) {
            throw new InconsistentStateException("Division not found for team with ID " + id);
        }

        List<PoolWithRankingInternalResponse> poolsWithRankings = competitionInternalClient.getPoolsWithRankingByTeam(id);
        logger.debug("Pools with ranking fetched",
            keyValue("action", "fetch_pools_with_ranking"),
            keyValue("team_id", id),
            keyValue("pools_count", poolsWithRankings != null ? poolsWithRankings.size() : 0));

        Set<Long> allTeamIds = poolsWithRankings.stream()
            .flatMap(p -> p.getRanking().stream())
            .map(TeamRankingInternalResponse::getTeamId)
            .collect(Collectors.toCollection(() -> new HashSet<>(64)));
        allTeamIds.add(id);

        Map<Long, TeamInternalResponse> teamsMap = new HashMap<>(allTeamIds.size() * 2);
        for (Long teamId : allTeamIds) {
            TeamInternalResponse t = teamInternalClient.getTeamById(teamId);
            if (t != null) {
                teamsMap.put(teamId, t);
            } else {
                logger.warn("Missing team while building enriched team",
                    keyValue("team_id", teamId),
                    keyValue("main_team_id", id));
            }
        }

        enrichTeamsWithClubData(teamsMap.values(), clubInternalClient);

        Set<Long> poolIds = poolsWithRankings.stream()
            .map(PoolWithRankingInternalResponse::getPoolId)
            .collect(Collectors.toSet());

        Map<Long, PoolInternalResponse> poolMap = new HashMap<>(poolIds.size() * 2);
        for (Long poolId : poolIds) {
            PoolInternalResponse pool = poolInternalClient.getPoolById(poolId);
            if (pool != null) {
                poolMap.put(poolId, pool);
            } else {
                logger.warn("Missing pool while building enriched team",
                    keyValue("pool_id", poolId),
                    keyValue("team_id", id));
            }
        }

        List<PoolResponse> enrichedPools = poolsWithRankings.stream()
            .map(p -> {
                PoolInternalResponse basePool = poolMap.get(p.getPoolId());
                if (basePool == null) {
                    throw new InconsistentStateException("Missing pool with ID " + p.getPoolId());
                }
                List<TeamWithStatsResponse> ranking = buildRanking(p.getRanking(), teamsMap);
                return PoolResponse.builder()
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

        ClubResponse club = clubInternalClient.getClubById(team.getClubId());

        String finalLogoUrl = StringUtils.isNotBlank(team.getLogoUrl())
            ? team.getLogoUrl()
            : (club != null ? club.getLogoUrl() : null);

        TeamResponse result = TeamResponse.builder()
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
            .club(club)
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

    public List<TeamSummaryResponse> getTeamsByClubId(String clubId) {
        if (StringUtils.isBlank(clubId)) {
            throw new InconsistentStateException("clubId must be a non-empty string");
        }
        long t0 = System.nanoTime();
        logger.info("Fetch teams by club",
            keyValue("action", "get_teams_by_club"),
            keyValue("club_id", clubId));

        List<TeamInternalResponse> teams = teamInternalClient.getTeamsByClubId(clubId);
        if (teams == null || teams.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Long> divisionIds = teams.stream()
            .map(TeamInternalResponse::getDivisionId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        Map<Long, DivisionResponse> divisionsById = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            DivisionResponse division = configInternalClient.getDivisionById(divisionId);
            if (division != null) {
                divisionsById.put(divisionId, division);
            } else {
                logger.warn("Division not found while building team summaries for club",
                    keyValue("division_id", divisionId),
                    keyValue("club_id", clubId));
            }
        }

        ClubResponse club = clubInternalClient.getClubById(clubId);

        List<TeamSummaryResponse> result = teams.stream()
            .map(t -> {
                String finalLogoUrl = StringUtils.isNotBlank(t.getLogoUrl())
                    ? t.getLogoUrl()
                    : club.getLogoUrl();

                return TeamSummaryResponse.builder()
                    .id(t.getId())
                    .name(t.getName())
                    .shortName(t.getShortName())
                    .format(t.getFormat())
                    .gender(t.getGender())
                    .season(t.getSeason())
                    .club(club)
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

    public List<TeamSummaryResponse> getTeamsByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new InconsistentStateException("ids must be a non-empty list");
        }
        long t0 = System.nanoTime();
        logger.info("Fetch teams by ids",
            keyValue("action", "get_teams_by_ids"),
            keyValue("ids_count", ids.size()));

        Set<Long> uniqueIds = new HashSet<>(ids);
        List<TeamInternalResponse> teams = new ArrayList<>(uniqueIds.size());
        for (Long teamId : uniqueIds) {
            TeamInternalResponse team = teamInternalClient.getTeamById(teamId);
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
            .map(TeamInternalResponse::getDivisionId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        Map<Long, DivisionResponse> divisionsById = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            DivisionResponse division = configInternalClient.getDivisionById(divisionId);
            if (division != null) {
                divisionsById.put(divisionId, division);
            } else {
                logger.warn("Division not found while building team summaries by ids",
                    keyValue("division_id", divisionId));
            }
        }

        Set<String> clubIds = teams.stream()
            .map(TeamInternalResponse::getClubId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        Map<String, ClubResponse> clubById = new HashMap<>(clubIds.size() * 2);
        for (String clubId : clubIds) {
            ClubResponse club = clubInternalClient.getClubById(clubId);
            if (club != null) {
                clubById.put(clubId, club);
            } else {
                logger.warn("Club not found while building team summaries by ids",
                    keyValue("club_id", clubId));
            }
        }

        List<TeamSummaryResponse> result = teams.stream()
            .map(t -> {
                ClubResponse club = clubById.get(t.getClubId());

                String finalLogoUrl = StringUtils.isNotBlank(t.getLogoUrl())
                    ? t.getLogoUrl()
                    : (club != null ? club.getLogoUrl() : null);

                return TeamSummaryResponse.builder()
                    .id(t.getId())
                    .name(t.getName())
                    .shortName(t.getShortName())
                    .format(t.getFormat())
                    .gender(t.getGender())
                    .season(t.getSeason())
                    .logoUrl(finalLogoUrl)
                    .club(club)
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

    public TeamInternalResponse updateTeam(Long id, UpdateTeamRequest dto, MultipartFile image) {
        logger.info("Update team",
            keyValue("action", "update_team"),
            keyValue("team_id", id),
            keyValue("has_payload", dto != null),
            keyValue("has_image", image != null));
        return teamInternalClient.updateTeam(id, dto, image);
    }
}
