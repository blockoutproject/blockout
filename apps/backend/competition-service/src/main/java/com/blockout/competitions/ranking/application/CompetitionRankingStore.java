package com.blockout.competitions.ranking.application;

import java.util.List;
import java.util.Set;

public interface CompetitionRankingStore {

    List<Long> findActivePoolIdsByTeam(Long teamId);

    List<CompetitionRankingSnapshot> findActiveByPoolIds(Set<Long> poolIds);
}
