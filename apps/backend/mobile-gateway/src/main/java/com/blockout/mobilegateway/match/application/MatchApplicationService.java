package com.blockout.mobilegateway.match.application;

import com.blockout.mobilegateway.club.infrastructure.ClubInternalClient;
import com.blockout.mobilegateway.competition.infrastructure.competition.CompetitionInternalClient;
import com.blockout.mobilegateway.competition.infrastructure.competition.models.CompetitionAssociationInternalResponse;
import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.config.api.models.DivisionResponse;
import com.blockout.mobilegateway.config.infrastructure.ConfigInternalClient;
import com.blockout.mobilegateway.ffvb.application.PdfLinkTokenService;
import com.blockout.mobilegateway.match.api.models.*;
import com.blockout.mobilegateway.match.infrastructure.MatchInternalClient;
import com.blockout.mobilegateway.pool.api.models.PoolInternalResponse;
import com.blockout.mobilegateway.pool.api.models.PoolResponse;
import com.blockout.mobilegateway.pool.infrastructure.PoolInternalClient;
import com.blockout.mobilegateway.shared.api.errors.InconsistentStateException;
import com.blockout.mobilegateway.shared.application.models.LiveLinkStatus;
import com.blockout.mobilegateway.team.api.models.TeamInternalResponse;
import com.blockout.mobilegateway.team.api.models.TeamWithStatsResponse;
import com.blockout.mobilegateway.team.infrastructure.TeamInternalClient;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;
import java.util.stream.Collectors;

import static com.blockout.mobilegateway.team.application.TeamLogoEnricher.enrichTeamsWithClubData;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class MatchApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(MatchApplicationService.class);

    private final MatchInternalClient matchInternalClient;
    private final PoolInternalClient poolInternalClient;
    private final TeamInternalClient teamInternalClient;
    private final ConfigInternalClient configInternalClient;
    private final CompetitionInternalClient competitionInternalClient;
    private final ClubInternalClient clubInternalClient;
    private final ApiClientProperties apiClientProperties;
    private final PdfLinkTokenService pdfLinkTokenService;

    public DayPageResponse getMatchList(String status, int page, int size, List<Long> poolFilterIds,
                                        List<Long> teamFilterIds) {
        long t0 = System.nanoTime();
        logger.info("Fetching match list",
            keyValue("action", "fetch_match_list"),
            keyValue("status", status),
            keyValue("page", page),
            keyValue("size", size),
            keyValue("pool_filter_ids_count", poolFilterIds != null ? poolFilterIds.size() : 0),
            keyValue("team_filter_ids_count", teamFilterIds != null ? teamFilterIds.size() : 0));

        DayPageInternalResponse dayPage = matchInternalClient.getMatchesByDay(page, size, poolFilterIds, teamFilterIds, status);
        if (dayPage == null || dayPage.getDayMatches() == null || dayPage.getDayMatches().isEmpty()) {
            logger.warn("No match data returned",
                keyValue("action", "fetch_match_list"),
                keyValue("page", page),
                keyValue("size", size));
            return DayPageResponse.builder()
                .dayMatches(Collections.emptyList())
                .hasNext(false)
                .nextPage(null)
                .build();
        }

        List<DayMatchesInternalResponse> dayGroups = dayPage.getDayMatches();

        Set<Long> poolIds = new HashSet<>(64);
        Set<Long> teamIds = new HashSet<>(128);
        for (DayMatchesInternalResponse day : dayGroups) {
            List<PoolMatchesInternalResponse> pools = day.getPools();
            if (pools == null) {
                continue;
            }
            for (PoolMatchesInternalResponse pool : pools) {
                poolIds.add(pool.getPoolId());
                List<MatchInternalResponse> matches = pool.getMatches();
                if (matches == null) {
                    continue;
                }
                for (MatchInternalResponse m : matches) {
                    teamIds.add(m.getTeamIdA());
                    teamIds.add(m.getTeamIdB());
                }
            }
        }

        logger.debug("Aggregated ids",
            keyValue("action", "aggregate_ids_from_matches"),
            keyValue("unique_pool_ids", poolIds.size()),
            keyValue("unique_team_ids", teamIds.size()));

        // Pools
        Map<Long, PoolInternalResponse> poolById = new HashMap<>(poolIds.size() * 2);
        for (Long poolId : poolIds) {
            PoolInternalResponse pool = poolInternalClient.getPoolById(poolId);
            if (pool != null) {
                poolById.put(poolId, pool);
            } else {
                logger.warn("Pool not found while building match list",
                    keyValue("pool_id", poolId));
            }
        }

        Set<Long> divisionIds = poolById.values().stream()
            .map(PoolInternalResponse::getDivisionId)
            .collect(Collectors.toSet());

        // Teams
        Map<Long, TeamInternalResponse> teamsMap = new HashMap<>(teamIds.size() * 2);
        for (Long teamId : teamIds) {
            TeamInternalResponse team = teamInternalClient.getTeamById(teamId);
            if (team != null) {
                teamsMap.put(teamId, team);
            } else {
                logger.warn("Team not found while building match list",
                    keyValue("team_id", teamId));
            }
        }

        // Logos clubs
        enrichTeamsWithClubData(teamsMap.values(), clubInternalClient);

        // Divisions
        Map<Long, DivisionResponse> divisionById = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            DivisionResponse division = configInternalClient.getDivisionById(divisionId);
            if (division != null) {
                divisionById.put(divisionId, division);
            } else {
                logger.warn("Division not found while building match list",
                    keyValue("division_id", divisionId));
            }
        }

        Map<Long, PoolResponse> enrichedPoolById = new HashMap<>(poolById.size() * 2);
        for (PoolInternalResponse p : poolById.values()) {
            DivisionResponse division = divisionById.get(p.getDivisionId());
            if (division == null || !Boolean.TRUE.equals(division.getActive())) {
                continue;
            }
            enrichedPoolById.put(p.getId(), PoolResponse.builder()
                .id(p.getId())
                .season(p.getSeason())
                .leagueCode(p.getLeagueCode())
                .leagueName(p.getLeagueName())
                .name(p.getName())
                .shortName(p.getShortName())
                .format(p.getFormat())
                .gender(p.getGender())
                .followersCount(p.getFollowersCount())
                .division(division)
                .build());
        }

        logger.debug("Fetched and enriched catalogs",
            keyValue("action", "enrich_catalogs"),
            keyValue("enriched_pools", enrichedPoolById.size()),
            keyValue("teams", teamsMap.size()),
            keyValue("active_divisions", divisionById.size()));

        List<DayMatchesResponse> enrichedDayMatches = new ArrayList<>(dayGroups.size());
        for (DayMatchesInternalResponse day : dayGroups) {
            List<PoolMatchesInternalResponse> pools = day.getPools();
            if (pools == null || pools.isEmpty()) {
                continue;
            }

            List<PoolMatchesResponse> enrichedPoolMatches = new ArrayList<>(pools.size());
            for (PoolMatchesInternalResponse pool : pools) {
                PoolResponse enrichedPool = enrichedPoolById.get(pool.getPoolId());
                if (enrichedPool == null) {
                    continue;
                }

                List<MatchInternalResponse> matches = pool.getMatches();
                if (matches == null || matches.isEmpty()) {
                    continue;
                }

                List<MatchResponse> enrichedMatches = new ArrayList<>(matches.size());
                for (MatchInternalResponse m : matches) {
                    enrichedMatches.add(MatchResponse.builder()
                        .id(m.getId())
                        .matchDate(m.getMatchDate())
                        .status(m.getStatus())
                        .set(m.getSet())
                        .score(m.getScore())
                        .venue(m.getVenue())
                        .firstReferee(m.getFirstReferee())
                        .secondReferee(m.getSecondReferee())
                        .liveCode(m.getLiveCode())
                        .teamA(teamsMap.get(m.getTeamIdA()))
                        .teamB(teamsMap.get(m.getTeamIdB()))
                        .liveUrl(m.getLiveUrl())
                        .build());
                }

                if (!enrichedMatches.isEmpty()) {
                    enrichedPoolMatches.add(PoolMatchesResponse.builder()
                        .pool(enrichedPool)
                        .matches(enrichedMatches)
                        .build());
                }
            }

            if (!enrichedPoolMatches.isEmpty()) {
                enrichedDayMatches.add(DayMatchesResponse.builder()
                    .date(day.getDate())
                    .pools(enrichedPoolMatches)
                    .build());
            }
        }

        long t1 = System.nanoTime();
        logger.info("Built enriched day matches",
            keyValue("action", "build_enriched_day_matches"),
            keyValue("day_groups", enrichedDayMatches.size()),
            keyValue("has_next", dayPage.isHasNext()),
            keyValue("next_page", dayPage.getNextPage()),
            keyValue("duration_ms", (t1 - t0) / 1_000_000));

        return DayPageResponse.builder()
            .dayMatches(enrichedDayMatches)
            .hasNext(dayPage.isHasNext())
            .nextPage(dayPage.getNextPage())
            .build();
    }

    public MatchResponse getMatchById(Long id) {
        long t0 = System.nanoTime();
        logger.info("Fetching match by id",
            keyValue("action", "get_match_by_id"),
            keyValue("match_id", id));

        MatchInternalResponse match = matchInternalClient.getMatchById(id);
        if (match == null) {
            throw new InconsistentStateException("Match not found with ID " + id);
        }

        PoolInternalResponse rawPool = poolInternalClient.getPoolById(match.getPoolId());
        if (rawPool == null) {
            throw new InconsistentStateException("Pool not found with ID " + match.getPoolId());
        }

        DivisionResponse division = configInternalClient.getDivisionById(rawPool.getDivisionId());
        if (division == null) {
            throw new InconsistentStateException("Division not found for pool with ID " + match.getPoolId());
        }

        List<CompetitionAssociationInternalResponse> associations = competitionInternalClient.getAssociationsByPool(rawPool.getId());

        Set<Long> teamIds = new HashSet<>(associations.size() + 2);
        for (CompetitionAssociationInternalResponse a : associations) {
            teamIds.add(a.getTeamId());
        }
        teamIds.add(match.getTeamIdA());
        teamIds.add(match.getTeamIdB());

        Map<Long, TeamInternalResponse> teamsMap = new HashMap<>(teamIds.size() * 2);
        for (Long teamId : teamIds) {
            TeamInternalResponse team = teamInternalClient.getTeamById(teamId);
            if (team != null) {
                teamsMap.put(teamId, team);
            } else {
                logger.warn("Missing team while building match details",
                    keyValue("team_id", teamId),
                    keyValue("pool_id", rawPool.getId()));
            }
        }

        // Enrich every team involved in the ranking and in the match.
        enrichTeamsWithClubData(teamsMap.values(), clubInternalClient);

        TeamInternalResponse teamA = teamsMap.get(match.getTeamIdA());
        if (teamA == null) {
            throw new InconsistentStateException("Team A not found with ID " + match.getTeamIdA());
        }

        TeamInternalResponse teamB = teamsMap.get(match.getTeamIdB());
        if (teamB == null) {
            throw new InconsistentStateException("Team B not found with ID " + match.getTeamIdB());
        }

        List<TeamWithStatsResponse> ranking = associations.stream()
            .map(assoc -> {
                TeamInternalResponse t = teamsMap.get(assoc.getTeamId());
                if (t == null) {
                    throw new InconsistentStateException(
                        "Missing team with ID " + assoc.getTeamId() + " for pool " + rawPool.getId());
                }
                return TeamWithStatsResponse.builder()
                    .id(t.getId())
                    .name(t.getName())
                    .shortName(t.getShortName())
                    .logoUrl(t.getLogoUrl())
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
                Comparator.comparingInt(TeamWithStatsResponse::getPoints).reversed()
                    .thenComparingInt(TeamWithStatsResponse::getPointsPenalty)
                    .thenComparing(Comparator.comparingInt(TeamWithStatsResponse::getWins).reversed())
                    .thenComparing(Comparator.comparingDouble(TeamWithStatsResponse::getCoefSets).reversed())
                    .thenComparing(Comparator.comparingDouble(TeamWithStatsResponse::getCoefPoints).reversed()))
            .toList();

        PoolResponse enrichedPool = PoolResponse.builder()
            .id(rawPool.getId())
            .season(rawPool.getSeason())
            .leagueCode(rawPool.getLeagueCode())
            .leagueName(rawPool.getLeagueName())
            .poolCode(rawPool.getPoolCode())
            .name(rawPool.getName())
            .shortName(rawPool.getShortName())
            .format(rawPool.getFormat())
            .gender(rawPool.getGender())
            .followersCount(rawPool.getFollowersCount())
            .division(division)
            .ranking(ranking)
            .build();

        String base = apiClientProperties.getMobilegateway().getUrl();
        String addressToken = pdfLinkTokenService.generate("address", match.getSeason(), match.getLeagueCode(),
            match.getMatchCode());
        String sheetToken = pdfLinkTokenService.generate("sheet", match.getSeason(), match.getLeagueCode(),
            match.getMatchCode());

        String addressUrl = UriComponentsBuilder.fromUriString(base)
            .path("/public/ffvb/pdf/")
            .path(addressToken)
            .toUriString();
        String sheetUrl = UriComponentsBuilder.fromUriString(base)
            .path("/public/ffvb/pdf/")
            .path(sheetToken)
            .toUriString();

        long t1 = System.nanoTime();
        logger.info("Built enriched match",
            keyValue("action", "build_enriched_match"),
            keyValue("match_id", id),
            keyValue("pool_id", rawPool.getId()),
            keyValue("division_id", division.getId()),
            keyValue("ranking_count", ranking.size()),
            keyValue("duration_ms", (t1 - t0) / 1_000_000));

        return MatchResponse.builder()
            .id(match.getId())
            .matchDate(match.getMatchDate())
            .status(match.getStatus())
            .set(match.getSet())
            .score(match.getScore())
            .venue(match.getVenue())
            .firstReferee(match.getFirstReferee())
            .secondReferee(match.getSecondReferee())
            .liveCode(match.getLiveCode())
            .liveUrl(match.getLiveUrl())
            .liveProvider(match.getLiveProvider())
            .liveOwnerAuth0Id(match.getLiveOwnerAuth0Id())
            .teamA(teamA)
            .teamB(teamB)
            .pool(enrichedPool)
            .matchAddressPdfUrl(addressUrl)
            .matchSheetPdfUrl(sheetUrl)
            .build();
    }

    public UpsertMatchLiveLinkResponse upsertLiveLink(Long matchId, UpsertMatchLiveLinkRequest request, String auth0Id) {
        logger.info("Upsert live link",
            keyValue("action", "upsert_match_live_link"),
            keyValue("match_id", matchId),
            keyValue("auth0_id", auth0Id));

        return matchInternalClient.upsertLiveLink(matchId, request);
    }

    public void deleteLiveLink(Long matchId, String auth0Id) {
        logger.info("Delete live link",
            keyValue("action", "delete_match_live_link"),
            keyValue("match_id", matchId),
            keyValue("auth0_id", auth0Id));

        matchInternalClient.deleteLiveLink(matchId);
    }

    public void reportLiveLink(Long matchId, ReportMatchLiveLinkRequest request, String auth0Id) {
        logger.info("Report live link",
            keyValue("action", "report_match_live_link"),
            keyValue("match_id", matchId),
            keyValue("auth0_id", auth0Id));

        matchInternalClient.reportLiveLink(matchId, request);
    }

    public List<MatchLiveLinkInternalResponse> getLiveLinksHistory(Long matchId, String auth0Id) {
        logger.info("Get live links history",
            keyValue("action", "get_match_live_links_history"),
            keyValue("match_id", matchId),
            keyValue("auth0_id", auth0Id));

        return matchInternalClient.getLiveLinksHistory(matchId);
    }

    public List<MatchLiveSummaryResponse> listMatchesForLiveModeration(LiveLinkStatus statusFilter) {
        logger.info("List live links for moderation",
            keyValue("action", "list_match_live_links_for_moderation"),
            keyValue("status_filter", statusFilter));

        List<MatchLiveSummaryInternalResponse> summaries = matchInternalClient.listMatchesForLiveModeration(statusFilter);
        if (summaries == null || summaries.isEmpty()) {
            logger.info("No matches returned for live moderation",
                keyValue("action", "list_match_live_links_for_moderation_empty"));
            return List.of();
        }

        Set<Long> poolIds = new HashSet<>(summaries.size());
        Set<Long> teamIds = new HashSet<>(summaries.size() * 2);
        for (MatchLiveSummaryInternalResponse m : summaries) {
            poolIds.add(m.getPoolId());
            teamIds.add(m.getTeamIdA());
            teamIds.add(m.getTeamIdB());
        }

        logger.debug("Aggregated ids for live moderation",
            keyValue("action", "aggregate_ids_from_live_moderation"),
            keyValue("unique_pool_ids", poolIds.size()),
            keyValue("unique_team_ids", teamIds.size()));

        Map<Long, PoolInternalResponse> poolById = new HashMap<>(poolIds.size() * 2);
        for (Long poolId : poolIds) {
            PoolInternalResponse pool = poolInternalClient.getPoolById(poolId);
            if (pool != null) {
                poolById.put(poolId, pool);
            } else {
                logger.warn("Pool not found while building moderation view",
                    keyValue("pool_id", poolId));
            }
        }

        Set<Long> divisionIds = poolById.values().stream()
            .map(PoolInternalResponse::getDivisionId)
            .collect(Collectors.toSet());

        Map<Long, DivisionResponse> divisionById = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            DivisionResponse division = configInternalClient.getDivisionById(divisionId);
            if (division != null) {
                divisionById.put(divisionId, division);
            } else {
                logger.warn("Division not found while building moderation view",
                    keyValue("division_id", divisionId));
            }
        }

        Map<Long, PoolResponse> enrichedPoolById = new HashMap<>(poolById.size() * 2);
        for (PoolInternalResponse p : poolById.values()) {
            DivisionResponse division = divisionById.get(p.getDivisionId());
            if (division == null || !Boolean.TRUE.equals(division.getActive())) {
                continue;
            }
            PoolResponse enrichedPool = PoolResponse.builder()
                .id(p.getId())
                .season(p.getSeason())
                .leagueCode(p.getLeagueCode())
                .leagueName(p.getLeagueName())
                .poolCode(p.getPoolCode())
                .name(p.getName())
                .shortName(p.getShortName())
                .format(p.getFormat())
                .gender(p.getGender())
                .followersCount(p.getFollowersCount())
                .division(division)
                .build();

            enrichedPoolById.put(p.getId(), enrichedPool);
        }

        Map<Long, TeamInternalResponse> teamsMap = new HashMap<>(teamIds.size() * 2);
        for (Long teamId : teamIds) {
            TeamInternalResponse team = teamInternalClient.getTeamById(teamId);
            if (team != null) {
                teamsMap.put(teamId, team);
            } else {
                logger.warn("Team not found while building moderation view",
                    keyValue("team_id", teamId));
            }
        }

        enrichTeamsWithClubData(teamsMap.values(), clubInternalClient);

        List<MatchLiveSummaryResponse> result = new ArrayList<>(summaries.size());
        for (MatchLiveSummaryInternalResponse m : summaries) {
            PoolResponse enrichedPool = enrichedPoolById.get(m.getPoolId());
            if (enrichedPool == null) {
                logger.warn("Skipping match in moderation view because enriched pool is missing or inactive",
                    keyValue("match_id", m.getId()),
                    keyValue("pool_id", m.getPoolId()));
                continue;
            }

            TeamInternalResponse teamA = teamsMap.get(m.getTeamIdA());
            TeamInternalResponse teamB = teamsMap.get(m.getTeamIdB());
            if (teamA == null || teamB == null) {
                logger.warn("Skipping match in moderation view because team is missing",
                    keyValue("match_id", m.getId()),
                    keyValue("team_id_a", m.getTeamIdA()),
                    keyValue("team_id_b", m.getTeamIdB()));
                continue;
            }

            MatchLiveSummaryResponse dto = MatchLiveSummaryResponse.builder()
                .id(m.getId())
                .matchDate(m.getMatchDate())
                .season(m.getSeason())
                .set(m.getSet())
                .score(m.getScore())
                .status(m.getStatus())
                .liveCode(m.getLiveCode())
                .lastLiveLinkId(m.getLastLiveLinkId())
                .lastLiveLinkStatus(m.getLastLiveLinkStatus())
                .lastLiveLinkProvider(m.getLastLiveLinkProvider())
                .lastLiveLinkUrl(m.getLastLiveLinkUrl())
                .lastLiveLinkOwnerAuth0Id(m.getLastLiveLinkOwnerAuth0Id())
                .lastLiveLinkCreatedAt(m.getLastLiveLinkCreatedAt())
                .teamA(teamA)
                .teamB(teamB)
                .pool(enrichedPool)
                .build();

            result.add(dto);
        }

        logger.debug("Built enriched moderation list",
            keyValue("action", "build_enriched_live_moderation"),
            keyValue("count", result.size()));

        return result;
    }

    public void approvePendingLiveLink(Long liveLinkId, String auth0Id) {
        logger.info("Approve pending live link",
            keyValue("action", "approve_pending_match_live_link"),
            keyValue("live_link_id", liveLinkId),
            keyValue("auth0_id", auth0Id));

        matchInternalClient.approvePendingLiveLink(liveLinkId);
    }

    public void rejectPendingLiveLink(Long liveLinkId, String auth0Id) {
        logger.info("Reject pending live link",
            keyValue("action", "reject_pending_match_live_link"),
            keyValue("live_link_id", liveLinkId),
            keyValue("auth0_id", auth0Id));

        matchInternalClient.rejectPendingLiveLink(liveLinkId);
    }

    public void reactivateLiveLink(Long liveLinkId, String auth0Id) {
        logger.info("Reactivate live link",
            keyValue("action", "reactivate_match_live_link"),
            keyValue("live_link_id", liveLinkId),
            keyValue("auth0_id", auth0Id));

        matchInternalClient.reactivateLiveLink(liveLinkId);
    }
}
