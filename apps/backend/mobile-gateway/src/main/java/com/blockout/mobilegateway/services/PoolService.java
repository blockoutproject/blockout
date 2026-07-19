package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.competition.CompetitionAssociationDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolSummaryDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolUpdateDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
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

import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;
import static com.blockout.mobilegateway.utils.TeamLogoEnricher.enrichTeamsWithClubData;

@Service
@RequiredArgsConstructor
public class PoolService {

    private static final Logger logger = LoggerFactory.getLogger(PoolService.class);

    private final PoolClientService poolClientService;
    private final ConfigClientService configClientService;
    private final CompetitionClientService competitionClientService;
    private final TeamClientService teamClientService;
    private final ClubClientService clubClientService;

    public EnrichedPoolDTO getPoolById(Long poolId) {
        long t0 = System.nanoTime();
        logger.info("Fetch enriched pool",
                keyValue("action", "get_pool_by_id"),
                keyValue("pool_id", poolId));

        PoolDTO rawPool = poolClientService.getPoolById(poolId);
        if (rawPool == null) {
            throw new InconsistentStateException("Pool not found with ID " + poolId);
        }

        DivisionDTO division = configClientService.getDivisionById(rawPool.getDivisionId());
        if (division == null) {
            throw new InconsistentStateException("Division not found for pool with ID " + poolId);
        }

        List<CompetitionAssociationDTO> associations = competitionClientService.getAssociationsByPool(poolId);
        Set<Long> teamIds = associations.stream()
                .map(CompetitionAssociationDTO::getTeamId)
                .collect(Collectors.toSet());

        Map<Long, TeamDTO> teamsMap = new HashMap<>(teamIds.size() * 2);
        for (Long teamId : teamIds) {
            TeamDTO team = teamClientService.getTeamById(teamId);
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
                .map(TeamDTO::getClubId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, ClubDTO> clubById = enrichTeamsWithClubData(teamsMap.values(), clubClientService);

        Comparator<TeamWithStatsDTO> rankingComparator = Comparator.comparingInt(TeamWithStatsDTO::getPoints).reversed()
                .thenComparingInt(TeamWithStatsDTO::getPointsPenalty)
                .thenComparing(Comparator.comparingInt(TeamWithStatsDTO::getWins).reversed())
                .thenComparing(Comparator.comparingDouble(TeamWithStatsDTO::getCoefSets).reversed())
                .thenComparing(Comparator.comparingDouble(TeamWithStatsDTO::getCoefPoints).reversed());

        List<TeamWithStatsDTO> ranking = associations.stream()
                .map(assoc -> {
                    TeamDTO team = teamsMap.get(assoc.getTeamId());
                    if (team == null) {
                        throw new InconsistentStateException(
                                "Missing team with ID " + assoc.getTeamId() + " for pool " + poolId);
                    }
                    ClubDTO club = clubById.get(team.getClubId());
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
                            .latitude(club == null ? null : club.getLatitude())
                            .longitude(club == null ? null : club.getLongitude())
                            .build();
                })
                .sorted(rankingComparator)
                .toList();

        EnrichedPoolDTO enriched = EnrichedPoolDTO.builder()
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

    public List<PoolSummaryDTO> getPoolsByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new InconsistentStateException("ids must be a non-empty list");
        }
        long t0 = System.nanoTime();
        logger.info("Fetch pool summaries",
                keyValue("action", "get_pools_by_ids"),
                keyValue("ids_count", ids.size()));

        Set<Long> uniqueIds = new HashSet<>(ids);
        List<PoolDTO> pools = new ArrayList<>(uniqueIds.size());
        for (Long id : uniqueIds) {
            PoolDTO pool = poolClientService.getPoolById(id);
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
                .map(PoolDTO::getDivisionId)
                .collect(Collectors.toSet());

        Map<Long, DivisionDTO> divisionsById = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            DivisionDTO division = configClientService.getDivisionById(divisionId);
            if (division != null) {
                divisionsById.put(divisionId, division);
            } else {
                logger.warn("Division not found while building pool summaries",
                        keyValue("division_id", divisionId));
            }
        }

        List<PoolSummaryDTO> result = pools.stream()
                .map(p -> PoolSummaryDTO.builder()
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

    public PoolDTO updatePool(Long id, PoolUpdateDTO dto) {
        logger.info("Update pool",
                keyValue("action", "update_pool"),
                keyValue("pool_id", id));
        return poolClientService.updatePool(id, dto);
    }
}
