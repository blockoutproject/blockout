package com.blockout.workersearch.projection.application.models;

public record PoolSearchProjection(
        Long id,
        String name,
        String shortName,
        Long divisionId,
        String divisionName,
        String leagueCode,
        String leagueName,
        String season,
        String logoUrl,
        String format,
        String gender) {}
