package com.blockout.competitions.ranking.application;

import com.blockout.competitions.association.persistence.CompetitionAssociationEntity;
import com.blockout.competitions.association.persistence.CompetitionAssociationRepository;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompetitionRankingService {

    private final CompetitionAssociationRepository repository;
    private final CompetitionRankingPolicy policy;

    @Transactional(readOnly = true)
    public List<PoolRankingView> findLegacyByTeam(Long teamId) {
        List<Long> poolIds = activePoolIds(teamId);
        return project(poolIds);
    }

    @Transactional(readOnly = true)
    public PoolRankingPage findPageByTeam(Long teamId, int page, int pageSize) {
        List<Long> poolIds = activePoolIds(teamId);
        long offset = (long) page * pageSize;
        if (offset >= poolIds.size()) {
            return new PoolRankingPage(List.of(), page, pageSize, poolIds.size(), false);
        }
        int from = (int) offset;
        int to = Math.min(from + pageSize, poolIds.size());
        return new PoolRankingPage(project(poolIds.subList(from, to)), page, pageSize, poolIds.size(),
                to < poolIds.size());
    }

    private List<Long> activePoolIds(Long teamId) {
        List<CompetitionAssociationEntity> teamAssociations = repository.findByTeamIdAndActive(teamId, true);
        return teamAssociations.stream().map(CompetitionAssociationEntity::getPoolId).distinct().sorted().toList();
    }

    private List<PoolRankingView> project(List<Long> orderedPoolIds) {
        Set<Long> poolIds = new LinkedHashSet<>(orderedPoolIds);
        if (poolIds.isEmpty()) {
            return List.of();
        }

        Map<Long, List<CompetitionAssociationEntity>> groupedByPool = repository.findByActiveTrueAndPoolIdIn(poolIds)
                .stream().collect(Collectors.groupingBy(CompetitionAssociationEntity::getPoolId));
        List<PoolRankingView> result = new ArrayList<>(orderedPoolIds.size());
        for (Long poolId : orderedPoolIds) {
            List<TeamRankingView> ranking = groupedByPool.getOrDefault(poolId, List.of()).stream()
                    .map(this::teamRanking)
                    .sorted(policy.order())
                    .toList();
            result.add(new PoolRankingView(poolId, ranking));
        }
        return List.copyOf(result);
    }

    private TeamRankingView teamRanking(CompetitionAssociationEntity association) {
        return new TeamRankingView(association.getTeamId(), association.getPoints(), association.getPointsPenalty(),
                association.getPlayed(), association.getWins(), association.getLosses(), association.getCoefSets(),
                association.getCoefPoints());
    }
}
