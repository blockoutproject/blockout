package com.blockout.mobilegateway.match.application;

import com.blockout.mobilegateway.club.infrastructure.ClubInternalClient;
import com.blockout.mobilegateway.competition.infrastructure.competition.CompetitionInternalClient;
import com.blockout.mobilegateway.competition.infrastructure.competition.models.CompetitionAssociationInternalResponse;
import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.config.application.views.DivisionView;
import com.blockout.mobilegateway.config.infrastructure.ConfigInternalClient;
import com.blockout.mobilegateway.ffvb.application.PdfLinkTokenService;
import com.blockout.mobilegateway.match.application.commands.ReportMatchLiveLinkCommand;
import com.blockout.mobilegateway.match.application.commands.UpsertMatchLiveLinkCommand;
import com.blockout.mobilegateway.match.application.views.MatchData;
import com.blockout.mobilegateway.match.application.views.MatchDayData;
import com.blockout.mobilegateway.match.application.views.MatchDayPageData;
import com.blockout.mobilegateway.match.application.views.MatchDayPageView;
import com.blockout.mobilegateway.match.application.views.MatchDayView;
import com.blockout.mobilegateway.match.application.views.MatchLiveLinkView;
import com.blockout.mobilegateway.match.application.views.MatchLiveSummaryData;
import com.blockout.mobilegateway.match.application.views.MatchLiveSummaryView;
import com.blockout.mobilegateway.match.application.views.MatchView;
import com.blockout.mobilegateway.match.application.views.PoolMatchesData;
import com.blockout.mobilegateway.match.application.views.PoolMatchesView;
import com.blockout.mobilegateway.match.application.views.UpsertMatchLiveLinkView;
import com.blockout.mobilegateway.match.infrastructure.MatchInternalClient;
import com.blockout.mobilegateway.pool.application.views.PoolDetailsView;
import com.blockout.mobilegateway.pool.application.views.PoolView;
import com.blockout.mobilegateway.pool.infrastructure.PoolInternalClient;
import com.blockout.mobilegateway.shared.api.errors.InconsistentStateException;
import com.blockout.mobilegateway.shared.application.models.LiveLinkStatus;
import com.blockout.mobilegateway.team.application.views.TeamDetailsView;
import com.blockout.mobilegateway.team.application.views.TeamWithStatsView;
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

    public MatchDayPageView getMatchList(String status, int page, int size, List<Long> poolFilterIds,
                                        List<Long> teamFilterIds) {
        long t0 = System.nanoTime();
        logger.info("Fetching match list",
            keyValue("action", "fetch_match_list"),
            keyValue("status", status),
            keyValue("page", page),
            keyValue("size", size),
            keyValue("pool_filter_ids_count", poolFilterIds != null ? poolFilterIds.size() : 0),
            keyValue("team_filter_ids_count", teamFilterIds != null ? teamFilterIds.size() : 0));

        MatchDayPageData dayPage = matchInternalClient.getMatchesByDay(page, size, poolFilterIds, teamFilterIds, status);
        if (dayPage == null || dayPage.getDayMatches() == null || dayPage.getDayMatches().isEmpty()) {
            logger.warn("No match data returned",
                keyValue("action", "fetch_match_list"),
                keyValue("page", page),
                keyValue("size", size));
            return MatchDayPageView.builder()
                .dayMatches(Collections.emptyList())
                .hasNext(false)
                .nextPage(null)
                .build();
        }

        List<MatchDayData> dayGroups = dayPage.getDayMatches();

        Set<Long> poolIds = new HashSet<>(64);
        Set<Long> teamIds = new HashSet<>(128);
        for (MatchDayData day : dayGroups) {
            List<PoolMatchesData> pools = day.getPools();
            if (pools == null) {
                continue;
            }
            for (PoolMatchesData pool : pools) {
                poolIds.add(pool.getPoolId());
                List<MatchData> matches = pool.getMatches();
                if (matches == null) {
                    continue;
                }
                for (MatchData m : matches) {
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
        Map<Long, PoolDetailsView> poolById = new HashMap<>(poolIds.size() * 2);
        for (Long poolId : poolIds) {
            PoolDetailsView pool = poolInternalClient.getPoolById(poolId);
            if (pool != null) {
                poolById.put(poolId, pool);
            } else {
                logger.warn("Pool not found while building match list",
                    keyValue("pool_id", poolId));
            }
        }

        Set<Long> divisionIds = poolById.values().stream()
            .map(PoolDetailsView::getDivisionId)
            .collect(Collectors.toSet());

        // Teams
        Map<Long, TeamDetailsView> teamsMap = new HashMap<>(teamIds.size() * 2);
        for (Long teamId : teamIds) {
            TeamDetailsView team = teamInternalClient.getTeamById(teamId);
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
        Map<Long, DivisionView> divisionById = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            DivisionView division = configInternalClient.getDivisionById(divisionId);
            if (division != null) {
                divisionById.put(divisionId, division);
            } else {
                logger.warn("Division not found while building match list",
                    keyValue("division_id", divisionId));
            }
        }

        Map<Long, PoolView> enrichedPoolById = new HashMap<>(poolById.size() * 2);
        for (PoolDetailsView p : poolById.values()) {
            DivisionView division = divisionById.get(p.getDivisionId());
            if (division == null || !Boolean.TRUE.equals(division.active())) {
                continue;
            }
            enrichedPoolById.put(p.getId(), PoolView.builder()
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

        List<MatchDayView> enrichedDayMatches = new ArrayList<>(dayGroups.size());
        for (MatchDayData day : dayGroups) {
            List<PoolMatchesData> pools = day.getPools();
            if (pools == null || pools.isEmpty()) {
                continue;
            }

            List<PoolMatchesView> enrichedPoolMatches = new ArrayList<>(pools.size());
            for (PoolMatchesData pool : pools) {
                PoolView enrichedPool = enrichedPoolById.get(pool.getPoolId());
                if (enrichedPool == null) {
                    continue;
                }

                List<MatchData> matches = pool.getMatches();
                if (matches == null || matches.isEmpty()) {
                    continue;
                }

                List<MatchView> enrichedMatches = new ArrayList<>(matches.size());
                for (MatchData m : matches) {
                    enrichedMatches.add(MatchView.builder()
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
                    enrichedPoolMatches.add(PoolMatchesView.builder()
                        .pool(enrichedPool)
                        .matches(enrichedMatches)
                        .build());
                }
            }

            if (!enrichedPoolMatches.isEmpty()) {
                enrichedDayMatches.add(MatchDayView.builder()
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

        return MatchDayPageView.builder()
            .dayMatches(enrichedDayMatches)
            .hasNext(dayPage.isHasNext())
            .nextPage(dayPage.getNextPage())
            .build();
    }

    public MatchView getMatchById(Long id) {
        long t0 = System.nanoTime();
        logger.info("Fetching match by id",
            keyValue("action", "get_match_by_id"),
            keyValue("match_id", id));

        MatchData match = matchInternalClient.getMatchById(id);
        if (match == null) {
            throw new InconsistentStateException("Match not found with ID " + id);
        }

        PoolDetailsView rawPool = poolInternalClient.getPoolById(match.getPoolId());
        if (rawPool == null) {
            throw new InconsistentStateException("Pool not found with ID " + match.getPoolId());
        }

        DivisionView division = configInternalClient.getDivisionById(rawPool.getDivisionId());
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

        Map<Long, TeamDetailsView> teamsMap = new HashMap<>(teamIds.size() * 2);
        for (Long teamId : teamIds) {
            TeamDetailsView team = teamInternalClient.getTeamById(teamId);
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

        TeamDetailsView teamA = teamsMap.get(match.getTeamIdA());
        if (teamA == null) {
            throw new InconsistentStateException("Team A not found with ID " + match.getTeamIdA());
        }

        TeamDetailsView teamB = teamsMap.get(match.getTeamIdB());
        if (teamB == null) {
            throw new InconsistentStateException("Team B not found with ID " + match.getTeamIdB());
        }

        List<TeamWithStatsView> ranking = associations.stream()
            .map(assoc -> {
                TeamDetailsView t = teamsMap.get(assoc.getTeamId());
                if (t == null) {
                    throw new InconsistentStateException(
                        "Missing team with ID " + assoc.getTeamId() + " for pool " + rawPool.getId());
                }
                return TeamWithStatsView.builder()
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
                Comparator.comparingInt(TeamWithStatsView::getPoints).reversed()
                    .thenComparingInt(TeamWithStatsView::getPointsPenalty)
                    .thenComparing(Comparator.comparingInt(TeamWithStatsView::getWins).reversed())
                    .thenComparing(Comparator.comparingDouble(TeamWithStatsView::getCoefSets).reversed())
                    .thenComparing(Comparator.comparingDouble(TeamWithStatsView::getCoefPoints).reversed()))
            .toList();

        PoolView enrichedPool = PoolView.builder()
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
            keyValue("division_id", division.id()),
            keyValue("ranking_count", ranking.size()),
            keyValue("duration_ms", (t1 - t0) / 1_000_000));

        return MatchView.builder()
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

    public UpsertMatchLiveLinkView upsertLiveLink(Long matchId, UpsertMatchLiveLinkCommand command) {
        logger.info("Upsert live link",
            keyValue("action", "upsert_match_live_link"),
            keyValue("match_id", matchId));

        return matchInternalClient.upsertLiveLink(matchId, command);
    }

    public void deleteLiveLink(Long matchId) {
        logger.info("Delete live link",
            keyValue("action", "delete_match_live_link"),
            keyValue("match_id", matchId));

        matchInternalClient.deleteLiveLink(matchId);
    }

    public void reportLiveLink(Long matchId, ReportMatchLiveLinkCommand command) {
        logger.info("Report live link",
            keyValue("action", "report_match_live_link"),
            keyValue("match_id", matchId));

        matchInternalClient.reportLiveLink(matchId, command);
    }

    public List<MatchLiveLinkView> getLiveLinksHistory(Long matchId) {
        logger.info("Get live links history",
            keyValue("action", "get_match_live_links_history"),
            keyValue("match_id", matchId));

        return matchInternalClient.getLiveLinksHistory(matchId);
    }

    public List<MatchLiveSummaryView> listMatchesForLiveModeration(LiveLinkStatus statusFilter) {
        logger.info("List live links for moderation",
            keyValue("action", "list_match_live_links_for_moderation"),
            keyValue("status_filter", statusFilter));

        List<MatchLiveSummaryData> summaries = matchInternalClient.listMatchesForLiveModeration(statusFilter);
        if (summaries == null || summaries.isEmpty()) {
            logger.info("No matches returned for live moderation",
                keyValue("action", "list_match_live_links_for_moderation_empty"));
            return List.of();
        }

        Set<Long> poolIds = new HashSet<>(summaries.size());
        Set<Long> teamIds = new HashSet<>(summaries.size() * 2);
        for (MatchLiveSummaryData m : summaries) {
            poolIds.add(m.getPoolId());
            teamIds.add(m.getTeamIdA());
            teamIds.add(m.getTeamIdB());
        }

        logger.debug("Aggregated ids for live moderation",
            keyValue("action", "aggregate_ids_from_live_moderation"),
            keyValue("unique_pool_ids", poolIds.size()),
            keyValue("unique_team_ids", teamIds.size()));

        Map<Long, PoolDetailsView> poolById = new HashMap<>(poolIds.size() * 2);
        for (Long poolId : poolIds) {
            PoolDetailsView pool = poolInternalClient.getPoolById(poolId);
            if (pool != null) {
                poolById.put(poolId, pool);
            } else {
                logger.warn("Pool not found while building moderation view",
                    keyValue("pool_id", poolId));
            }
        }

        Set<Long> divisionIds = poolById.values().stream()
            .map(PoolDetailsView::getDivisionId)
            .collect(Collectors.toSet());

        Map<Long, DivisionView> divisionById = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            DivisionView division = configInternalClient.getDivisionById(divisionId);
            if (division != null) {
                divisionById.put(divisionId, division);
            } else {
                logger.warn("Division not found while building moderation view",
                    keyValue("division_id", divisionId));
            }
        }

        Map<Long, PoolView> enrichedPoolById = new HashMap<>(poolById.size() * 2);
        for (PoolDetailsView p : poolById.values()) {
            DivisionView division = divisionById.get(p.getDivisionId());
            if (division == null || !Boolean.TRUE.equals(division.active())) {
                continue;
            }
            PoolView enrichedPool = PoolView.builder()
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

        Map<Long, TeamDetailsView> teamsMap = new HashMap<>(teamIds.size() * 2);
        for (Long teamId : teamIds) {
            TeamDetailsView team = teamInternalClient.getTeamById(teamId);
            if (team != null) {
                teamsMap.put(teamId, team);
            } else {
                logger.warn("Team not found while building moderation view",
                    keyValue("team_id", teamId));
            }
        }

        enrichTeamsWithClubData(teamsMap.values(), clubInternalClient);

        List<MatchLiveSummaryView> result = new ArrayList<>(summaries.size());
        for (MatchLiveSummaryData m : summaries) {
            PoolView enrichedPool = enrichedPoolById.get(m.getPoolId());
            if (enrichedPool == null) {
                logger.warn("Skipping match in moderation view because enriched pool is missing or inactive",
                    keyValue("match_id", m.getId()),
                    keyValue("pool_id", m.getPoolId()));
                continue;
            }

            TeamDetailsView teamA = teamsMap.get(m.getTeamIdA());
            TeamDetailsView teamB = teamsMap.get(m.getTeamIdB());
            if (teamA == null || teamB == null) {
                logger.warn("Skipping match in moderation view because team is missing",
                    keyValue("match_id", m.getId()),
                    keyValue("team_id_a", m.getTeamIdA()),
                    keyValue("team_id_b", m.getTeamIdB()));
                continue;
            }

            MatchLiveSummaryView dto = MatchLiveSummaryView.builder()
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

    public void approvePendingLiveLink(Long liveLinkId) {
        logger.info("Approve pending live link",
            keyValue("action", "approve_pending_match_live_link"),
            keyValue("live_link_id", liveLinkId));

        matchInternalClient.approvePendingLiveLink(liveLinkId);
    }

    public void rejectPendingLiveLink(Long liveLinkId) {
        logger.info("Reject pending live link",
            keyValue("action", "reject_pending_match_live_link"),
            keyValue("live_link_id", liveLinkId));

        matchInternalClient.rejectPendingLiveLink(liveLinkId);
    }

    public void reactivateLiveLink(Long liveLinkId) {
        logger.info("Reactivate live link",
            keyValue("action", "reactivate_match_live_link"),
            keyValue("live_link_id", liveLinkId));

        matchInternalClient.reactivateLiveLink(liveLinkId);
    }
}
