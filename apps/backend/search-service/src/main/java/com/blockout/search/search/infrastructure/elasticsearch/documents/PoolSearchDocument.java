package com.blockout.search.search.infrastructure.elasticsearch.documents;

public record PoolSearchDocument(
        Long id,
        String name,
        String shortName,
        Long divisionId,
        String divisionName,
        String leagueCode,
        String leagueName,
        String season,
        String format,
        String gender,
        String logoUrl) {}
