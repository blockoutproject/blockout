package com.blockout.competitions.ranking.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CompetitionRankingProjector {

    private final CompetitionRankingPolicy policy;

    public List<PoolRankingView> project(
            List<Long> orderedPoolIds, List<CompetitionRankingSnapshot> associations) {
        Map<Long, List<CompetitionRankingSnapshot>> groupedByPool = associations.stream()
                .collect(Collectors.groupingBy(CompetitionRankingSnapshot::poolId));
        List<PoolRankingView> result = new ArrayList<>(orderedPoolIds.size());
        for (Long poolId : orderedPoolIds) {
            List<TeamRankingView> ranking = groupedByPool.getOrDefault(poolId, List.of()).stream()
                    .map(CompetitionRankingSnapshot::toView)
                    .sorted(policy.order())
                    .toList();
            result.add(new PoolRankingView(poolId, ranking));
        }
        return List.copyOf(result);
    }
}
