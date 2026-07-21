package com.blockout.search.search.api.models;

public record PoolSearchInternalResponse(
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
