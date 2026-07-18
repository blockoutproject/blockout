package com.blockout.search.pool.application;

/** Application-owned pool autocomplete view, including the retained v1 short name. */
public record PoolSearchView(
        Long id,
        String name,
        String shortName,
        String divisionName,
        String leagueCode,
        String leagueName,
        String season,
        String format,
        String gender,
        String logoUrl) {
}
