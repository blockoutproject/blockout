package com.blockout.mobilegateway.pool.application;

import com.blockout.mobilegateway.club.application.views.ClubView;
import com.blockout.mobilegateway.club.infrastructure.ClubInternalClient;
import com.blockout.mobilegateway.competition.infrastructure.competition.CompetitionInternalClient;
import com.blockout.mobilegateway.competition.infrastructure.competition.models.CompetitionAssociationInternalResponse;
import com.blockout.mobilegateway.config.application.views.DivisionView;
import com.blockout.mobilegateway.config.infrastructure.ConfigInternalClient;
import com.blockout.mobilegateway.pool.application.commands.UpdatePoolCommand;
import com.blockout.mobilegateway.pool.application.views.PoolDetailsView;
import com.blockout.mobilegateway.pool.application.views.PoolSummaryView;
import com.blockout.mobilegateway.pool.application.views.PoolView;
import com.blockout.mobilegateway.pool.infrastructure.PoolInternalClient;
import com.blockout.mobilegateway.shared.api.errors.InconsistentStateException;
import com.blockout.mobilegateway.team.application.views.TeamDetailsView;
import com.blockout.mobilegateway.team.application.views.TeamWithStatsView;
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

    public PoolView getPoolById(Long poolId) {
        long t0 = System.nanoTime();
        logger.info("Fetch enriched pool",
            keyValue("action", "get_pool_by_id"),
            keyValue("pool_id", poolId));

        PoolDetailsView rawPool = poolInternalClient.getPoolById(poolId);
        if (rawPool == null) {
            throw new InconsistentStateException("Pool not found with ID " + poolId);
        }

        DivisionView division = configInternalClient.getDivisionById(rawPool.getDivisionId());
        if (division == null) {
            throw new InconsistentStateException("Division not found for pool with ID " + poolId);
        }

        List<CompetitionAssociationInternalResponse> associations = competitionInternalClient.getAssociationsByPool(poolId);
        Set<Long> teamIds = associations.stream()
            .map(CompetitionAssociationInternalResponse::getTeamId)
            .collect(Collectors.toSet());

        Map<Long, TeamDetailsView> teamsMap = new HashMap<>(teamIds.size() * 2);
        for (Long teamId : teamIds) {
            TeamDetailsView team = teamInternalClient.getTeamById(teamId);
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
            .map(TeamDetailsView::getClubId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        Map<String, ClubView> clubById = enrichTeamsWithClubData(teamsMap.values(), clubInternalClient);

        Comparator<TeamWithStatsView> rankingComparator = Comparator.comparingInt(TeamWithStatsView::getPoints).reversed()
            .thenComparingInt(TeamWithStatsView::getPointsPenalty)
            .thenComparing(Comparator.comparingInt(TeamWithStatsView::getWins).reversed())
            .thenComparing(Comparator.comparingDouble(TeamWithStatsView::getCoefSets).reversed())
            .thenComparing(Comparator.comparingDouble(TeamWithStatsView::getCoefPoints).reversed());

        List<TeamWithStatsView> ranking = associations.stream()
            .map(assoc -> {
                TeamDetailsView team = teamsMap.get(assoc.getTeamId());
                if (team == null) {
                    throw new InconsistentStateException(
                        "Missing team with ID " + assoc.getTeamId() + " for pool " + poolId);
                }
                ClubView club = clubById.get(team.getClubId());
                return TeamWithStatsView.builder()
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
                    .latitude(club == null ? null : club.latitude())
                    .longitude(club == null ? null : club.longitude())
                    .build();
            })
            .sorted(rankingComparator)
            .toList();

        PoolView enriched = PoolView.builder()
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

    public List<PoolSummaryView> getPoolsByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new InconsistentStateException("ids must be a non-empty list");
        }
        long t0 = System.nanoTime();
        logger.info("Fetch pool summaries",
            keyValue("action", "get_pools_by_ids"),
            keyValue("ids_count", ids.size()));

        Set<Long> uniqueIds = new HashSet<>(ids);
        List<PoolDetailsView> pools = new ArrayList<>(uniqueIds.size());
        for (Long id : uniqueIds) {
            PoolDetailsView pool = poolInternalClient.getPoolById(id);
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
            .map(PoolDetailsView::getDivisionId)
            .collect(Collectors.toSet());

        Map<Long, DivisionView> divisionsById = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            DivisionView division = configInternalClient.getDivisionById(divisionId);
            if (division != null) {
                divisionsById.put(divisionId, division);
            } else {
                logger.warn("Division not found while building pool summaries",
                    keyValue("division_id", divisionId));
            }
        }

        List<PoolSummaryView> result = pools.stream()
            .map(p -> PoolSummaryView.builder()
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

    public PoolDetailsView updatePool(Long id, UpdatePoolCommand command) {
        logger.info("Update pool",
            keyValue("action", "update_pool"),
            keyValue("pool_id", id));
        return poolInternalClient.updatePool(id, command);
    }
}
