package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.match.DayPageDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedDayMatchesDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedMatchDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedPoolMatchesDTO;
import com.blockout.mobilegateway.models.dto.match.DayMatchesDTO;
import com.blockout.mobilegateway.models.dto.match.MatchDTO;
import com.blockout.mobilegateway.models.dto.match.PoolMatchesDTO;
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

    public List<EnrichedDayMatchesDTO> getMatchList(
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
            logger.warn("No match data returned",
                    keyValue("action", "empty_match_data"),
                    keyValue("page", page));
            return Collections.emptyList();
        }

        List<DayMatchesDTO> dayGroups = dayPage.getDayMatches();

        Set<Long> poolIds = new HashSet<>();
        Set<Long> teamIds = new HashSet<>();

        for (DayMatchesDTO day : dayGroups) {
            if (day.getPools() == null) continue;
            for (PoolMatchesDTO pool : day.getPools()) {
                poolIds.add(pool.getPoolId());
                if (pool.getMatches() == null) continue;
                for (MatchDTO match : pool.getMatches()) {
                    teamIds.add(match.getTeamIdA());
                    teamIds.add(match.getTeamIdB());
                }
            }
        }

        logger.info("Aggregated IDs from matches",
                keyValue("poolCount", poolIds.size()),
                keyValue("teamCount", teamIds.size()));

        Map<Long, PoolDTO> poolMap = poolClientService.getPoolsByIds(poolIds).stream()
                .collect(Collectors.toMap(PoolDTO::getId, Function.identity()));

        Map<Long, TeamDTO> teamMap = teamClientService.getTeamsByIds(teamIds).stream()
                .collect(Collectors.toMap(TeamDTO::getId, Function.identity()));

        logger.info("Fetched and mapped related data",
                keyValue("poolsFetched", poolMap.size()),
                keyValue("teamsFetched", teamMap.size()));

        List<EnrichedDayMatchesDTO> enrichedDays = new ArrayList<>();

        for (DayMatchesDTO day : dayGroups) {
            List<EnrichedPoolMatchesDTO> enrichedPools = new ArrayList<>();
            for (PoolMatchesDTO pool : day.getPools()) {
                List<EnrichedMatchDTO> enrichedMatches = new ArrayList<>();
                for (MatchDTO match : pool.getMatches()) {
                    enrichedMatches.add(enrichMatch(match, teamMap));
                }
                enrichedPools.add(
                        EnrichedPoolMatchesDTO.builder()
                                .poolId(pool.getPoolId())
                                .poolData(poolMap.get(pool.getPoolId()))
                                .matches(enrichedMatches)
                                .build()
                );
            }
            enrichedDays.add(
                    EnrichedDayMatchesDTO.builder()
                            .date(day.getDate())
                            .pools(enrichedPools)
                            .build()
            );
        }

        logger.info("Built enriched match list",
                keyValue("enrichedDayCount", enrichedDays.size()));

        return enrichedDays;
    }

    private EnrichedMatchDTO enrichMatch(MatchDTO match, Map<Long, TeamDTO> teamMap) {
        return EnrichedMatchDTO.builder()
                .id(match.getId())
                .matchCode(match.getMatchCode())
                .leagueCode(match.getLeagueCode())
                .poolId(match.getPoolId())
                .teamIdA(match.getTeamIdA())
                .teamIdB(match.getTeamIdB())
                .matchDate(match.getMatchDate())
                .status(match.getStatus())
                .set(match.getSet())
                .score(match.getScore())
                .venue(match.getVenue())
                .referee1(match.getReferee1())
                .referee2(match.getReferee2())
                .liveCode(match.getLiveCode())
                .lastUpdate(match.getLastUpdate())
                .active(match.getActive())
                .teamA(teamMap.get(match.getTeamIdA()))
                .teamB(teamMap.get(match.getTeamIdB()))
                .build();
    }
}