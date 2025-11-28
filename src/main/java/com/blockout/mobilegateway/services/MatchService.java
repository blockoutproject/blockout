package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.models.dto.competition.CompetitionAssociationDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.match.DayMatchesDTO;
import com.blockout.mobilegateway.models.dto.match.DayPageDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedDayMatchesDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedDayPageDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedMatchDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedMatchLiveSummaryDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedPoolMatchesDTO;
import com.blockout.mobilegateway.models.dto.match.MatchDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkReportRequestDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkRequestDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkResponseDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveSummaryDTO;
import com.blockout.mobilegateway.models.dto.match.PoolMatchesDTO;
import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamWithStatsDTO;
import com.blockout.mobilegateway.services.clients.ClubClientService;
import com.blockout.mobilegateway.services.clients.CompetitionClientService;
import com.blockout.mobilegateway.services.clients.ConfigClientService;
import com.blockout.mobilegateway.services.clients.MatchClientService;
import com.blockout.mobilegateway.services.clients.PoolClientService;
import com.blockout.mobilegateway.services.clients.TeamClientService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;
import java.util.stream.Collectors;

import static com.blockout.mobilegateway.utils.TeamLogoEnricher.enrichTeamsWithClubLogo;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class MatchService {

    private static final Logger logger = LoggerFactory.getLogger(MatchService.class);

    private final MatchClientService matchClientService;
    private final PoolClientService poolClientService;
    private final TeamClientService teamClientService;
    private final ConfigClientService configClientService;
    private final CompetitionClientService competitionClientService;
    private final ClubClientService clubClientService;
    private final ApiClientProperties apiClientProperties;
    private final PdfLinkTokenService pdfLinkTokenService;

    public EnrichedDayPageDTO getMatchList(String status, int page, int size, List<Long> poolFilterIds,
            List<Long> teamFilterIds) {
        logger.info("Fetching match list",
                keyValue("action", "fetch_match_list"),
                keyValue("status", status),
                keyValue("page", page),
                keyValue("size", size),
                keyValue("pool_filter_ids_count", poolFilterIds != null ? poolFilterIds.size() : 0),
                keyValue("team_filter_ids_count", teamFilterIds != null ? teamFilterIds.size() : 0));

        DayPageDTO dayPage = matchClientService.getMatchesByDay(page, size, poolFilterIds, teamFilterIds, status);
        if (dayPage == null || dayPage.getDayMatches() == null || dayPage.getDayMatches().isEmpty()) {
            logger.warn("No match data returned",
                    keyValue("action", "fetch_match_list"),
                    keyValue("page", page),
                    keyValue("size", size));
            return EnrichedDayPageDTO.builder()
                    .dayMatches(Collections.emptyList())
                    .hasNext(false)
                    .nextPage(null)
                    .build();
        }

        List<DayMatchesDTO> dayGroups = dayPage.getDayMatches();

        Set<Long> poolIds = new HashSet<>(64);
        Set<Long> teamIds = new HashSet<>(128);
        for (DayMatchesDTO day : dayGroups) {
            List<PoolMatchesDTO> pools = day.getPools();
            if (pools == null) {
                continue;
            }
            for (PoolMatchesDTO pool : pools) {
                poolIds.add(pool.getPoolId());
                List<MatchDTO> matches = pool.getMatches();
                if (matches == null) {
                    continue;
                }
                for (MatchDTO m : matches) {
                    teamIds.add(m.getTeamIdA());
                    teamIds.add(m.getTeamIdB());
                }
            }
        }

        logger.info("Aggregated ids",
                keyValue("action", "aggregate_ids_from_matches"),
                keyValue("unique_pool_ids", poolIds.size()),
                keyValue("unique_team_ids", teamIds.size()));

        // Pools
        Map<Long, PoolDTO> poolById = new HashMap<>(poolIds.size() * 2);
        for (Long poolId : poolIds) {
            PoolDTO pool = poolClientService.getPoolById(poolId);
            if (pool != null) {
                poolById.put(poolId, pool);
            } else {
                logger.warn("Pool not found while building match list",
                        keyValue("pool_id", poolId));
            }
        }

        Set<Long> divisionIds = poolById.values().stream()
                .map(PoolDTO::getDivisionId)
                .collect(Collectors.toSet());

        // Teams
        Map<Long, TeamDTO> teamsMap = new HashMap<>(teamIds.size() * 2);
        for (Long teamId : teamIds) {
            TeamDTO team = teamClientService.getTeamById(teamId);
            if (team != null) {
                teamsMap.put(teamId, team);
            } else {
                logger.warn("Team not found while building match list",
                        keyValue("team_id", teamId));
            }
        }

        // Logos clubs
        enrichTeamsWithClubLogo(teamsMap.values(), clubClientService);

        // Divisions
        Map<Long, DivisionDTO> divisionById = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            DivisionDTO division = configClientService.getDivisionById(divisionId);
            if (division != null) {
                divisionById.put(divisionId, division);
            } else {
                logger.warn("Division not found while building match list",
                        keyValue("division_id", divisionId));
            }
        }

        Map<Long, EnrichedPoolDTO> enrichedPoolById = new HashMap<>(poolById.size() * 2);
        for (PoolDTO p : poolById.values()) {
            DivisionDTO division = divisionById.get(p.getDivisionId());
            if (division == null || !Boolean.TRUE.equals(division.getActive())) {
                continue;
            }
            enrichedPoolById.put(p.getId(), EnrichedPoolDTO.builder()
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

        logger.info("Fetched and enriched catalogs",
                keyValue("action", "enrich_catalogs"),
                keyValue("enriched_pools", enrichedPoolById.size()),
                keyValue("teams", teamsMap.size()),
                keyValue("active_divisions", divisionById.size()));

        List<EnrichedDayMatchesDTO> enrichedDayMatches = new ArrayList<>(dayGroups.size());
        for (DayMatchesDTO day : dayGroups) {
            List<PoolMatchesDTO> pools = day.getPools();
            if (pools == null || pools.isEmpty()) {
                continue;
            }

            List<EnrichedPoolMatchesDTO> enrichedPoolMatches = new ArrayList<>(pools.size());
            for (PoolMatchesDTO pool : pools) {
                EnrichedPoolDTO enrichedPool = enrichedPoolById.get(pool.getPoolId());
                if (enrichedPool == null) {
                    continue;
                }

                List<MatchDTO> matches = pool.getMatches();
                if (matches == null || matches.isEmpty()) {
                    continue;
                }

                List<EnrichedMatchDTO> enrichedMatches = new ArrayList<>(matches.size());
                for (MatchDTO m : matches) {
                    enrichedMatches.add(EnrichedMatchDTO.builder()
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
                            .build());
                }

                if (!enrichedMatches.isEmpty()) {
                    enrichedPoolMatches.add(EnrichedPoolMatchesDTO.builder()
                            .pool(enrichedPool)
                            .matches(enrichedMatches)
                            .build());
                }
            }

            if (!enrichedPoolMatches.isEmpty()) {
                enrichedDayMatches.add(EnrichedDayMatchesDTO.builder()
                        .date(day.getDate())
                        .pools(enrichedPoolMatches)
                        .build());
            }
        }

        logger.info("Built enriched day matches",
                keyValue("action", "build_enriched_day_matches"),
                keyValue("day_groups", enrichedDayMatches.size()),
                keyValue("has_next", dayPage.isHasNext()),
                keyValue("next_page", dayPage.getNextPage()));

        return EnrichedDayPageDTO.builder()
                .dayMatches(enrichedDayMatches)
                .hasNext(dayPage.isHasNext())
                .nextPage(dayPage.getNextPage())
                .build();
    }

    public EnrichedMatchDTO getMatchById(Long id) {
        logger.info("Fetching match by id",
                keyValue("action", "get_match_by_id"),
                keyValue("match_id", id));

        MatchDTO match = matchClientService.getMatchById(id);
        if (match == null) {
            throw new InconsistentStateException("Match not found with ID " + id);
        }

        PoolDTO rawPool = poolClientService.getPoolById(match.getPoolId());
        if (rawPool == null) {
            throw new InconsistentStateException("Pool not found with ID " + match.getPoolId());
        }

        DivisionDTO division = configClientService.getDivisionById(rawPool.getDivisionId());
        if (division == null) {
            throw new InconsistentStateException("Division not found for pool with ID " + match.getPoolId());
        }

        List<CompetitionAssociationDTO> associations = competitionClientService.getAssociationsByPool(rawPool.getId());

        Set<Long> teamIds = new HashSet<>(associations.size() + 2);
        for (CompetitionAssociationDTO a : associations) {
            teamIds.add(a.getTeamId());
        }
        teamIds.add(match.getTeamIdA());
        teamIds.add(match.getTeamIdB());

        Map<Long, TeamDTO> teamsMap = new HashMap<>(teamIds.size() * 2);
        for (Long teamId : teamIds) {
            TeamDTO team = teamClientService.getTeamById(teamId);
            if (team != null) {
                teamsMap.put(teamId, team);
            } else {
                logger.warn("Missing team while building match details",
                        keyValue("team_id", teamId),
                        keyValue("pool_id", rawPool.getId()));
            }
        }

        // Enrich logos pour toutes les équipes concernées (classement + équipes du
        // match)
        enrichTeamsWithClubLogo(teamsMap.values(), clubClientService);

        TeamDTO teamA = teamsMap.get(match.getTeamIdA());
        if (teamA == null) {
            throw new InconsistentStateException("Team A not found with ID " + match.getTeamIdA());
        }

        TeamDTO teamB = teamsMap.get(match.getTeamIdB());
        if (teamB == null) {
            throw new InconsistentStateException("Team B not found with ID " + match.getTeamIdB());
        }

        List<TeamWithStatsDTO> ranking = associations.stream()
                .map(assoc -> {
                    TeamDTO t = teamsMap.get(assoc.getTeamId());
                    if (t == null) {
                        throw new InconsistentStateException(
                                "Missing team with ID " + assoc.getTeamId() + " for pool " + rawPool.getId());
                    }
                    return TeamWithStatsDTO.builder()
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
                        Comparator.comparingInt(TeamWithStatsDTO::getPoints).reversed()
                                .thenComparingInt(TeamWithStatsDTO::getPointsPenalty)
                                .thenComparing(Comparator.comparingInt(TeamWithStatsDTO::getWins).reversed())
                                .thenComparing(Comparator.comparingDouble(TeamWithStatsDTO::getCoefSets).reversed())
                                .thenComparing(Comparator.comparingDouble(TeamWithStatsDTO::getCoefPoints).reversed()))
                .toList();

        EnrichedPoolDTO enrichedPool = EnrichedPoolDTO.builder()
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

        logger.info("Built enriched match",
                keyValue("action", "build_enriched_match"),
                keyValue("match_id", id),
                keyValue("pool_id", rawPool.getId()),
                keyValue("division_id", division.getId()),
                keyValue("ranking_count", ranking.size()));

        return EnrichedMatchDTO.builder()
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

    /* ========= LIVE LINK CRUD ========= */

    public MatchLiveLinkResponseDTO upsertLiveLink(Long matchId, MatchLiveLinkRequestDTO request, String auth0Id) {
        logger.info("Upsert live link",
                keyValue("action", "upsert_match_live_link"),
                keyValue("match_id", matchId),
                keyValue("auth0_id", auth0Id));

        return matchClientService.upsertLiveLink(matchId, request);
    }

    public void deleteLiveLink(Long matchId, String auth0Id) {
        logger.info("Delete live link",
                keyValue("action", "delete_match_live_link"),
                keyValue("match_id", matchId),
                keyValue("auth0_id", auth0Id));

        matchClientService.deleteLiveLink(matchId);
    }

    public void reportLiveLink(Long matchId, MatchLiveLinkReportRequestDTO request, String auth0Id) {
        logger.info("Report live link",
                keyValue("action", "report_match_live_link"),
                keyValue("match_id", matchId),
                keyValue("auth0_id", auth0Id));

        matchClientService.reportLiveLink(matchId, request);
    }

    public List<MatchLiveLinkDTO> getLiveLinksHistory(Long matchId, String auth0Id) {
        logger.info("Get live links history",
                keyValue("action", "get_match_live_links_history"),
                keyValue("match_id", matchId),
                keyValue("auth0_id", auth0Id));

        return matchClientService.getLiveLinksHistory(matchId);
    }

    /**
     * Retourne la liste enrichie pour modération.
     * On consomme /api/v1/matches/live-moderation côté API matches
     * (MatchLiveSummaryDTO) sans ajouter de filtre côté gateway.
     */
    public List<EnrichedMatchLiveSummaryDTO> listMatchesForLiveModeration() {
        logger.info("List live links for moderation",
                keyValue("action", "list_match_live_links_for_moderation"));

        List<MatchLiveSummaryDTO> summaries = matchClientService.listMatchesForLiveModeration();
        if (summaries == null || summaries.isEmpty()) {
            logger.info("No matches returned for live moderation",
                    keyValue("action", "list_match_live_links_for_moderation_empty"));
            return List.of();
        }

        // Agrégation pools & équipes
        Set<Long> poolIds = new HashSet<>(summaries.size());
        Set<Long> teamIds = new HashSet<>(summaries.size() * 2);
        for (MatchLiveSummaryDTO m : summaries) {
            poolIds.add(m.getPoolId());
            teamIds.add(m.getTeamIdA());
            teamIds.add(m.getTeamIdB());
        }

        logger.info("Aggregated ids for live moderation",
                keyValue("action", "aggregate_ids_from_live_moderation"),
                keyValue("unique_pool_ids", poolIds.size()),
                keyValue("unique_team_ids", teamIds.size()));

        // Pools
        Map<Long, PoolDTO> poolById = new HashMap<>(poolIds.size() * 2);
        for (Long poolId : poolIds) {
            PoolDTO pool = poolClientService.getPoolById(poolId);
            if (pool != null) {
                poolById.put(poolId, pool);
            } else {
                logger.warn("Pool not found while building moderation view",
                        keyValue("pool_id", poolId));
            }
        }

        // Divisions
        Set<Long> divisionIds = poolById.values().stream()
                .map(PoolDTO::getDivisionId)
                .collect(Collectors.toSet());

        Map<Long, DivisionDTO> divisionById = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            DivisionDTO division = configClientService.getDivisionById(divisionId);
            if (division != null) {
                divisionById.put(divisionId, division);
            } else {
                logger.warn("Division not found while building moderation view",
                        keyValue("division_id", divisionId));
            }
        }

        // Pools enrichis (sans ranking ici, pas nécessaire pour la modération)
        Map<Long, EnrichedPoolDTO> enrichedPoolById = new HashMap<>(poolById.size() * 2);
        for (PoolDTO p : poolById.values()) {
            DivisionDTO division = divisionById.get(p.getDivisionId());
            if (division == null || !Boolean.TRUE.equals(division.getActive())) {
                continue;
            }
            EnrichedPoolDTO enrichedPool = EnrichedPoolDTO.builder()
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

        // Équipes
        Map<Long, TeamDTO> teamsMap = new HashMap<>(teamIds.size() * 2);
        for (Long teamId : teamIds) {
            TeamDTO team = teamClientService.getTeamById(teamId);
            if (team != null) {
                teamsMap.put(teamId, team);
            } else {
                logger.warn("Team not found while building moderation view",
                        keyValue("team_id", teamId));
            }
        }

        // Logos clubs
        enrichTeamsWithClubLogo(teamsMap.values(), clubClientService);

        // Construction du résultat enrichi
        List<EnrichedMatchLiveSummaryDTO> result = new ArrayList<>(summaries.size());
        for (MatchLiveSummaryDTO m : summaries) {
            EnrichedPoolDTO enrichedPool = enrichedPoolById.get(m.getPoolId());
            if (enrichedPool == null) {
                logger.warn("Skipping match in moderation view because enriched pool is missing or inactive",
                        keyValue("match_id", m.getId()),
                        keyValue("pool_id", m.getPoolId()));
                continue;
            }

            TeamDTO teamA = teamsMap.get(m.getTeamIdA());
            TeamDTO teamB = teamsMap.get(m.getTeamIdB());
            if (teamA == null || teamB == null) {
                logger.warn("Skipping match in moderation view because team is missing",
                        keyValue("match_id", m.getId()),
                        keyValue("team_id_a", m.getTeamIdA()),
                        keyValue("team_id_b", m.getTeamIdB()));
                continue;
            }

            EnrichedMatchLiveSummaryDTO dto = EnrichedMatchLiveSummaryDTO.builder()
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

        logger.info("Built enriched moderation list",
                keyValue("action", "build_enriched_live_moderation"),
                keyValue("count", result.size()));

        return result;
    }

    public void approvePendingLiveLink(Long liveLinkId, String auth0Id) {
        logger.info("Approve pending live link",
                keyValue("action", "approve_pending_match_live_link"),
                keyValue("live_link_id", liveLinkId),
                keyValue("auth0_id", auth0Id));

        matchClientService.approvePendingLiveLink(liveLinkId);
    }

    public void rejectPendingLiveLink(Long liveLinkId, String auth0Id) {
        logger.info("Reject pending live link",
                keyValue("action", "reject_pending_match_live_link"),
                keyValue("live_link_id", liveLinkId),
                keyValue("auth0_id", auth0Id));

        matchClientService.rejectPendingLiveLink(liveLinkId);
    }
}