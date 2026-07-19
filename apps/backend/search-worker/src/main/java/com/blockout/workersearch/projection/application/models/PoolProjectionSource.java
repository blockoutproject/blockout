package com.blockout.workersearch.projection.application.models;

public record PoolProjectionSource(
        Long id,
        String name,
        String shortName,
        Long divisionId,
        String leagueCode,
        String leagueName,
        String season,
        Format format,
        Gender gender) {}
