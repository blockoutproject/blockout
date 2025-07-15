package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.match.*;
import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.services.clients.ConfigClientService;
import com.blockout.mobilegateway.services.clients.MatchClientService;
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
public class MatchListService {

    private static final Logger logger = LoggerFactory.getLogger(MatchListService.class);

    private final MatchClientService matchClientService;
    private final PoolClientService poolClientService;
    private final TeamClientService teamClientService;
    private final ConfigClientService configClientService;

    public EnrichedDayPageDTO getMatchList(
            String status,
            int page,
            int size,
            List<Long> poolFilterIds,
            List<Long> teamFilterIds
    ) {
        logger.info("Fetching match list",
                keyValue("action", "fetch_match_list"),
                keyValue("status", status),
                keyValue("page", page),
                keyValue("size", size),
                keyValue("poolFilterIds", poolFilterIds),
                keyValue("teamFilterIds", teamFilterIds)
        );

        DayPageDTO dayPage = matchClientService.getMatchesByDay(page, size, poolFilterIds, teamFilterIds, status);
        if (dayPage == null || dayPage.getDayMatches() == null) {
            logger.warn("No match data returned", keyValue("page", page));
            return EnrichedDayPageDTO.builder()
                    .dayMatches(Collections.emptyList())
                    .hasNext(false)
                    .nextPage(null)
                    .build(
            );
        }

        List<DayMatchesDTO> dayGroups = dayPage.getDayMatches();

        Set<Long> poolIds = new HashSet<>();
        Set<Long> teamIds = new HashSet<>();
        Set<Long> divisionIds = new HashSet<>();

        for (DayMatchesDTO day : dayGroups) {
            if (day.getPools() == null) continue;
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
        List<DivisionDTO> divisions = configClientService.listDivisions().stream()
                .filter(d -> divisionIds.contains(d.getId()))
                .toList();

        Map<Long, EnrichedPoolDTO> enrichedPoolMap = rawPools.stream()
                .map(pool -> {
                    DivisionDTO division = divisions.stream()
                            .filter(d -> Objects.equals(d.getId(), pool.getDivisionId()))
                            .findFirst()
                            .orElse(null);
                    return EnrichedPoolDTO.builder()
                            .id(pool.getId())
                            .season(pool.getSeason())
                            .leagueName(pool.getLeagueName())
                            .name(pool.getName())
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
                List<EnrichedMatchDTO> enrichedMatches = new ArrayList<>();
                for (MatchDTO match : pool.getMatches()) {
                    enrichedMatches.add(enrichMatch(match, teamMap));
                }
                enrichedPoolMatches.add(
                        EnrichedPoolMatchesDTO.builder()
                                .pool(enrichedPoolMap.get(pool.getPoolId()))
                                .matches(enrichedMatches)
                                .build()
                );
            }
            enrichedDayMatches.add(
                    EnrichedDayMatchesDTO.builder()
                            .date(day.getDate())
                            .pools(enrichedPoolMatches)
                            .build()
            );
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
}