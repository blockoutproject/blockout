package com.blockout.competitions.ranking.application;

import java.util.List;

public record PoolRankingPage(
        List<PoolRankingView> items,
        int page,
        int pageSize,
        long totalItems,
        boolean hasNext) {

    public PoolRankingPage {
        items = List.copyOf(items);
    }
}
