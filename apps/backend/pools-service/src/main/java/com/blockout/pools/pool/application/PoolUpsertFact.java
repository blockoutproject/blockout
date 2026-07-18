package com.blockout.pools.pool.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

public record PoolUpsertFact(
        Long id, String name, String shortName, Long divisionId, String leagueCode,
        String leagueName, String season, FormatEnum format, GenderEnum gender) {

    public static PoolUpsertFact from(PoolView pool) {
        return new PoolUpsertFact(pool.id(), pool.name(), pool.shortName(), pool.divisionId(), pool.leagueCode(),
                pool.leagueName(), pool.season(), pool.format(), pool.gender());
    }
}
