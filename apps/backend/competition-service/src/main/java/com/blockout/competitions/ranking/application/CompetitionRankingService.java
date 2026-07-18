package com.blockout.competitions.ranking.application;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompetitionRankingService {

    private final CompetitionRankingStore store;
    private final CompetitionRankingProjector projector;

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
        return store.findActivePoolIdsByTeam(teamId).stream().distinct().sorted().toList();
    }

    private List<PoolRankingView> project(List<Long> orderedPoolIds) {
        Set<Long> poolIds = new LinkedHashSet<>(orderedPoolIds);
        if (poolIds.isEmpty()) {
            return List.of();
        }

        return projector.project(orderedPoolIds, store.findActiveByPoolIds(poolIds));
    }
}
