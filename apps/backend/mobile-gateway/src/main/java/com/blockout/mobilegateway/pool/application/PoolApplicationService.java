package com.blockout.mobilegateway.pool.application;

import com.blockout.mobilegateway.club.api.models.ClubResponse;
import com.blockout.mobilegateway.club.infrastructure.ClubInternalClient;
import com.blockout.mobilegateway.competition.infrastructure.competition.CompetitionInternalClient;
import com.blockout.mobilegateway.competition.infrastructure.competition.models.CompetitionAssociationInternalResponse;
import com.blockout.mobilegateway.config.api.models.DivisionResponse;
import com.blockout.mobilegateway.config.infrastructure.ConfigInternalClient;
import com.blockout.mobilegateway.pool.api.models.PoolInternalResponse;
import com.blockout.mobilegateway.pool.api.models.PoolResponse;
import com.blockout.mobilegateway.pool.api.models.PoolSummaryResponse;
import com.blockout.mobilegateway.pool.api.models.UpdatePoolRequest;
import com.blockout.mobilegateway.pool.infrastructure.PoolInternalClient;
import com.blockout.mobilegateway.shared.api.errors.InconsistentStateException;
import com.blockout.mobilegateway.team.api.models.TeamInternalResponse;
import com.blockout.mobilegateway.team.api.models.TeamWithStatsResponse;
import com.blockout.mobilegateway.team.infrastructure.TeamInternalClient;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

import static com.blockout.mobilegateway.team.application.TeamLogoEnricher.enrichTeamsWithClubData;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class PoolApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(PoolApplicationService.class);

    private final PoolInternalClient poolInternalClient;
    private final ConfigInternalClient configInternalClient;
    private final CompetitionInternalClient competitionInternalClient;
    private final TeamInternalClient teamInternalClient;
    private final ClubInternalClient clubInternalClient;

    public PoolResponse getPoolById(Long poolId) {
        long t0 = System.nanoTime();
        logger.info("Fetch enriched pool",
            keyValue("action", "get_pool_by_id"),
            keyValue("pool_id", poolId));

        PoolInternalResponse rawPool = poolInternalClient.getPoolById(poolId);
        if (rawPool == null) {
            throw new InconsistentStateException("Pool not found with ID " + poolId);
        }

        DivisionResponse division = configInternalClient.getDivisionById(rawPool.getDivisionId());
        if (division == null) {
            throw new InconsistentStateException("Division not found for pool with ID " + poolId);
        }

        List<CompetitionAssociationInternalResponse> associations = competitionInternalClient.getAssociationsByPool(poolId);
        Set<Long> teamIds = associations.stream()
            .map(CompetitionAssociationInternalResponse::getTeamId)
            .collect(Collectors.toSet());

        Map<Long, TeamInternalResponse> teamsMap = new HashMap<>(teamIds.size() * 2);
        for (Long teamId : teamIds) {
            TeamInternalResponse team = teamInternalClient.getTeamById(teamId);
            if (team != null) {
                teamsMap.put(teamId, team);
            } else {
                logger.warn("Missing team while building pool details",
                    keyValue("team_id", teamId),
                    keyValue("pool_id", poolId));
            }
        }

        // Pour les logs : combien de clubs distincts
        Set<String> clubIds = teamsMap.values().stream()
            .map(TeamInternalResponse::getClubId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        Map<String, ClubResponse> clubById = enrichTeamsWithClubData(teamsMap.values(), clubInternalClient);

        Comparator<TeamWithStatsResponse> rankingComparator = Comparator.comparingInt(TeamWithStatsResponse::getPoints).reversed()
            .thenComparingInt(TeamWithStatsResponse::getPointsPenalty)
            .thenComparing(Comparator.comparingInt(TeamWithStatsResponse::getWins).reversed())
            .thenComparing(Comparator.comparingDouble(TeamWithStatsResponse::getCoefSets).reversed())
            .thenComparing(Comparator.comparingDouble(TeamWithStatsResponse::getCoefPoints).reversed());

        List<TeamWithStatsResponse> ranking = associations.stream()
            .map(assoc -> {
                TeamInternalResponse team = teamsMap.get(assoc.getTeamId());
                if (team == null) {
                    throw new InconsistentStateException(
                        "Missing team with ID " + assoc.getTeamId() + " for pool " + poolId);
                }
                ClubResponse club = clubById.get(team.getClubId());
                return TeamWithStatsResponse.builder()
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
                    .latitude(club == null ? null : club.getLatitude())
                    .longitude(club == null ? null : club.getLongitude())
                    .build();
            })
            .sorted(rankingComparator)
            .toList();

        PoolResponse enriched = PoolResponse.builder()
            .id(rawPool.getId())
            .season(rawPool.getSeason())
            .leagueCode(rawPool.getLeagueCode())
            .leagueName(rawPool.getLeagueName())
            .poolCode(rawPool.getPoolCode())
            .name(rawPool.getName())
            .shortName(rawPool.getShortName())
            .rawName(rawPool.getRawName())
            .division(division)
            .format(rawPool.getFormat())
            .gender(rawPool.getGender())
            .followersCount(rawPool.getFollowersCount())
            .ranking(ranking)
            .build();

        long t1 = System.nanoTime();
        logger.info("Enriched pool built",
            keyValue("action", "get_pool_by_id_done"),
            keyValue("pool_id", poolId),
            keyValue("teams_count", teamsMap.size()),
            keyValue("clubs_count", clubIds.size()),
            keyValue("ranking_count", ranking.size()),
            keyValue("duration_ms", (t1 - t0) / 1_000_000));
        return enriched;
    }

    public List<PoolSummaryResponse> getPoolsByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new InconsistentStateException("ids must be a non-empty list");
        }
        long t0 = System.nanoTime();
        logger.info("Fetch pool summaries",
            keyValue("action", "get_pools_by_ids"),
            keyValue("ids_count", ids.size()));

        Set<Long> uniqueIds = new HashSet<>(ids);
        List<PoolInternalResponse> pools = new ArrayList<>(uniqueIds.size());
        for (Long id : uniqueIds) {
            PoolInternalResponse pool = poolInternalClient.getPoolById(id);
            if (pool != null && pool.getActive()) {
                pools.add(pool);
            } else {
                logger.warn("Pool not found while building pool summaries",
                    keyValue("pool_id", id));
            }
        }

        if (pools.isEmpty()) {
            logger.info("No pools found",
                keyValue("action", "get_pools_by_ids"),
                keyValue("ids_count", ids.size()));
            return Collections.emptyList();
        }

        Set<Long> divisionIds = pools.stream()
            .map(PoolInternalResponse::getDivisionId)
            .collect(Collectors.toSet());

        Map<Long, DivisionResponse> divisionsById = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            DivisionResponse division = configInternalClient.getDivisionById(divisionId);
            if (division != null) {
                divisionsById.put(divisionId, division);
            } else {
                logger.warn("Division not found while building pool summaries",
                    keyValue("division_id", divisionId));
            }
        }

        List<PoolSummaryResponse> result = pools.stream()
            .map(p -> PoolSummaryResponse.builder()
                .id(p.getId())
                .leagueCode(p.getLeagueCode())
                .leagueName(p.getLeagueName())
                .name(p.getName())
                .shortName(p.getShortName())
                .season(p.getSeason())
                .format(p.getFormat())
                .gender(p.getGender())
                .division(divisionsById.get(p.getDivisionId()))
                .build())
            .toList();

        long t1 = System.nanoTime();
        logger.info("Pool summaries built",
            keyValue("action", "get_pools_by_ids_done"),
            keyValue("result_count", result.size()),
            keyValue("unique_divisions", divisionsById.size()),
            keyValue("duration_ms", (t1 - t0) / 1_000_000));
        return result;
    }

    public PoolInternalResponse updatePool(Long id, UpdatePoolRequest dto) {
        logger.info("Update pool",
            keyValue("action", "update_pool"),
            keyValue("pool_id", id));
        return poolInternalClient.updatePool(id, dto);
    }
}
