package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.competition.CompetitionAssociationDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.match.DayMatchesDTO;
import com.blockout.mobilegateway.models.dto.match.DayPageDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedDayMatchesDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedDayPageDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedMatchDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedPoolMatchesDTO;
import com.blockout.mobilegateway.models.dto.match.MatchDTO;
import com.blockout.mobilegateway.models.dto.match.PoolMatchesDTO;
import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamWithStatsDTO;
import com.blockout.mobilegateway.services.clients.MatchClientService;
import com.blockout.mobilegateway.services.clients.PoolClientService;
import com.blockout.mobilegateway.services.clients.TeamClientService;
import com.blockout.mobilegateway.services.clients.ConfigClientService;
import com.blockout.mobilegateway.services.clients.ClubClientService;
import com.blockout.mobilegateway.services.clients.CompetitionClientService;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

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

    public EnrichedDayPageDTO getMatchList(
            String status,
            int page,
            int size,
            List<Long> poolFilterIds,
            List<Long> teamFilterIds) {

        logger.info("Fetching match list",
                keyValue("action", "fetch_match_list"),
                keyValue("status", status),
                keyValue("page", page),
                keyValue("size", size),
                keyValue("poolFilterIds", poolFilterIds),
                keyValue("teamFilterIds", teamFilterIds));

        DayPageDTO dayPage = matchClientService.getMatchesByDay(page, size, poolFilterIds, teamFilterIds, status);
        if (dayPage == null || dayPage.getDayMatches() == null) {
            logger.warn("No match data returned", keyValue("page", page));
            return EnrichedDayPageDTO.builder()
                    .dayMatches(Collections.emptyList())
                    .hasNext(false)
                    .nextPage(null)
                    .build();
        }

        List<DayMatchesDTO> dayGroups = dayPage.getDayMatches();

        Set<Long> poolIds = new HashSet<>();
        Set<Long> teamIds = new HashSet<>();
        Set<Long> divisionIds = new HashSet<>();

        for (DayMatchesDTO day : dayGroups) {
            if (day.getPools() == null)
                continue;
            for (PoolMatchesDTO pool : day.getPools()) {
                poolIds.add(pool.getPoolId());
                if (pool.getMatches() != null) {
                    for (MatchDTO match : pool.getMatches()) {
                        teamIds.add(match.getTeamIdA());
                        teamIds.add(match.getTeamIdB());
                    }
                }
            }
        }

        logger.info("Aggregated IDs from matches",
                keyValue("poolCount", poolIds.size()),
                keyValue("teamCount", teamIds.size()));

        List<PoolDTO> rawPools = poolClientService.getPoolsByIds(poolIds);
        rawPools.forEach(pool -> divisionIds.add(pool.getDivisionId()));

        List<TeamDTO> teams = teamClientService.getTeamsByIds(teamIds);

        Set<String> clubIds = teams.stream()
                .map(TeamDTO::getClubId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        logger.info("Fetching logos for clubs", keyValue("clubIds", clubIds));

        List<ClubDTO> clubs = clubClientService.getClubsByIds(clubIds);

        Map<String, String> clubLogoMap = new HashMap<>();
        for (ClubDTO club : clubs) {
            clubLogoMap.put(club.getId(), club.getLogoUrl());
        }

        teams.forEach(team -> {
            String logoUrl = clubLogoMap.get(team.getClubId());
            team.setLogoUrl(logoUrl);
        });

        List<DivisionDTO> divisions = configClientService.listDivisions().stream()
                .filter(d -> divisionIds.contains(d.getId()) && Boolean.TRUE.equals(d.getActive()))
                .toList();

        Set<Long> activeDivisionIds = divisions.stream()
                .map(DivisionDTO::getId)
                .collect(Collectors.toSet());

        Map<Long, EnrichedPoolDTO> enrichedPoolMap = rawPools.stream()
                .filter(pool -> activeDivisionIds.contains(pool.getDivisionId()))
                .map(pool -> {
                    DivisionDTO division = divisions.stream()
                            .filter(d -> Objects.equals(d.getId(), pool.getDivisionId()))
                            .findFirst()
                            .orElse(null);
                    return EnrichedPoolDTO.builder()
                            .id(pool.getId())
                            .season(pool.getSeason())
                            .leagueCode(pool.getLeagueCode())
                            .leagueName(pool.getLeagueName())
                            .name(pool.getName())
                            .shortName(pool.getShortName())
                            .format(pool.getFormat())
                            .gender(pool.getGender())
                            .followersCount(pool.getFollowersCount())
                            .division(division)
                            .build();
                })
                .collect(Collectors.toMap(EnrichedPoolDTO::getId, Function.identity()));

        Map<Long, TeamDTO> teamMap = teams.stream()
                .collect(Collectors.toMap(TeamDTO::getId, Function.identity()));

        logger.info("Fetched and enriched pools, teams, and divisions",
                keyValue("enrichedPools", enrichedPoolMap.size()),
                keyValue("teams", teamMap.size()),
                keyValue("divisions", divisions.size()));

        List<EnrichedDayMatchesDTO> enrichedDayMatches = new ArrayList<>();

        for (DayMatchesDTO day : dayGroups) {
            List<EnrichedPoolMatchesDTO> enrichedPoolMatches = new ArrayList<>();

            for (PoolMatchesDTO pool : day.getPools()) {
                if (!enrichedPoolMap.containsKey(pool.getPoolId())) {
                    continue;
                }

                List<EnrichedMatchDTO> enrichedMatches = new ArrayList<>();
                for (MatchDTO match : pool.getMatches()) {
                    enrichedMatches.add(enrichMatch(match, teamMap));
                }

                if (!enrichedMatches.isEmpty()) {
                    enrichedPoolMatches.add(
                            EnrichedPoolMatchesDTO.builder()
                                    .pool(enrichedPoolMap.get(pool.getPoolId()))
                                    .matches(enrichedMatches)
                                    .build());
                }
            }

            if (!enrichedPoolMatches.isEmpty()) {
                enrichedDayMatches.add(
                        EnrichedDayMatchesDTO.builder()
                                .date(day.getDate())
                                .pools(enrichedPoolMatches)
                                .build());
            }
        }

        logger.info("Built enriched day matches list",
                keyValue("enrichedDayMatchesCount", enrichedDayMatches.size()));

        return EnrichedDayPageDTO.builder()
                .dayMatches(enrichedDayMatches)
                .hasNext(dayPage.isHasNext())
                .nextPage(dayPage.getNextPage())
                .build();
    }

    private EnrichedMatchDTO enrichMatch(MatchDTO match, Map<Long, TeamDTO> teamMap) {
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
                .teamA(teamMap.get(match.getTeamIdA()))
                .teamB(teamMap.get(match.getTeamIdB()))
                .build();
    }

    public EnrichedMatchDTO getMatchById(Long id) {
        MatchDTO match = matchClientService.getMatchById(id);

        if (match == null) {
            throw new InconsistentStateException("Match not found with ID " + id);
        }

        TeamDTO teamA = teamClientService.getTeamById(match.getTeamIdA());

        if (teamA == null) {
            throw new InconsistentStateException("Team A not found with ID " + match.getTeamIdA());
        }

        TeamDTO teamB = teamClientService.getTeamById(match.getTeamIdB());

        if (teamB == null) {
            throw new InconsistentStateException("Team B not found with ID " + match.getTeamIdB());
        }

        PoolDTO rawPool = poolClientService.getPoolById(match.getPoolId());

        if (rawPool == null) {
            throw new InconsistentStateException("Pool not found with ID " + match.getPoolId());
        }

        DivisionDTO division = configClientService.getDivisionById(rawPool.getDivisionId());

        if (division == null) {
            throw new InconsistentStateException("Division not found for pool with ID " + match.getPoolId());
        }

        // Associations & équipes concernées
        List<CompetitionAssociationDTO> associations = competitionClientService
                .getAssociationsByPool(rawPool.getId());
        Set<Long> teamIds = associations.stream().map(CompetitionAssociationDTO::getTeamId).collect(Collectors.toSet());
        teamIds.add(teamA.getId());
        teamIds.add(teamB.getId());

        // Fetch de toutes les équipes concernées
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

        // Enrichissement du ranking
        List<TeamWithStatsDTO> ranking = associations.stream()
                .map(assoc -> {
                    TeamDTO team = teamsMap.get(assoc.getTeamId());
                    if (team == null) {
                        throw new InconsistentStateException(
                                "Missing team with ID " + assoc.getTeamId() + " for pool " + rawPool.getId());
                    }
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
                .sorted(
                        Comparator.comparingInt(TeamWithStatsDTO::getPoints).reversed()
                                .thenComparingInt(TeamWithStatsDTO::getPointsPenalty)
                                .thenComparing(Comparator.comparingInt(TeamWithStatsDTO::getWins).reversed())
                                .thenComparing(Comparator.comparingDouble(TeamWithStatsDTO::getCoefSets).reversed())
                                .thenComparing(Comparator.comparingDouble(TeamWithStatsDTO::getCoefPoints).reversed()))
                .toList();

        // Construction de l’objet pool enrichi
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

        // Enrichissement final : teamA et teamB (logo déjà injecté dans teamsMap)
        teamA.setLogoUrl(teamsMap.get(teamA.getId()).getLogoUrl());
        teamB.setLogoUrl(teamsMap.get(teamB.getId()).getLogoUrl());

        String base = apiClientProperties.getMobilegateway().getUrl();

        String addressToken = pdfLinkTokenService.generate(
                "address", match.getSeason(), match.getLeagueCode(), match.getMatchCode());
        String sheetToken = pdfLinkTokenService.generate(
                "sheet", match.getSeason(), match.getLeagueCode(), match.getMatchCode());

        String addressUrl = UriComponentsBuilder.fromUriString(base)
                .path("/public/ffvb/pdf/").path(addressToken).toUriString();

        String sheetUrl = UriComponentsBuilder.fromUriString(base)
                .path("/public/ffvb/pdf/").path(sheetToken).toUriString();

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
                .teamA(teamA)
                .teamB(teamB)
                .pool(enrichedPool)
                .matchAddressPdfUrl(addressUrl)
                .matchSheetPdfUrl(sheetUrl)
                .build();
    }
}