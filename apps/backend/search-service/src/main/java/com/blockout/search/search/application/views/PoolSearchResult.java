package com.blockout.search.search.application.views;

public record PoolSearchResult(
        Long id,
        String name,
        String shortName,
        String divisionName,
        String leagueCode,
        String leagueName,
        String season,
        String format,
        String gender,
        String logoUrl) {}
