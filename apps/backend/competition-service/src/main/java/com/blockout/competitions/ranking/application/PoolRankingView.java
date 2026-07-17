package com.blockout.competitions.ranking.application;

import java.util.List;

public record PoolRankingView(Long poolId, List<TeamRankingView> ranking) {

    public PoolRankingView {
        ranking = List.copyOf(ranking);
    }
}
