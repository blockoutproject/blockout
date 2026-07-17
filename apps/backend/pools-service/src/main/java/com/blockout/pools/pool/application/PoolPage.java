package com.blockout.pools.pool.application;

import java.util.List;

public record PoolPage(List<PoolView> items, int page, int pageSize, long totalItems, boolean hasNext) {

    public PoolPage {
        items = List.copyOf(items);
    }
}
