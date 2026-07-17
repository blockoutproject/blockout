package com.blockout.pools.pool.application;

import java.util.Collections;
import java.util.List;

public record PoolFilter(String leagueCode, String season, Boolean active, List<Long> ids) {

    public PoolFilter {
        ids = ids == null ? Collections.emptyList() : List.copyOf(ids);
    }
}
