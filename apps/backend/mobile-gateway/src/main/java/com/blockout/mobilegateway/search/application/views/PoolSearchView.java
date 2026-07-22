package com.blockout.mobilegateway.search.application.views;

/** Pool search result used by the gateway application layer. */
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
