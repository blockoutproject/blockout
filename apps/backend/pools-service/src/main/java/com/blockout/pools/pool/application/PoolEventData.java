package com.blockout.pools.pool.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

public record PoolEventData(
        Long id,
        String name,
        String shortName,
        Long divisionId,
        String leagueCode,
        String leagueName,
        String season,
        FormatEnum format,
        GenderEnum gender,
        boolean active,
        long revision) {

    public static PoolEventData from(PoolView pool) {
        return new PoolEventData(
                pool.id(),
                pool.name(),
                pool.shortName(),
                pool.divisionId(),
                pool.leagueCode(),
                pool.leagueName(),
                pool.season(),
                pool.format(),
                pool.gender(),
                Boolean.TRUE.equals(pool.active()),
                pool.revision());
    }
}
