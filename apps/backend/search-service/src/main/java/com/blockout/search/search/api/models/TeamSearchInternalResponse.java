package com.blockout.search.search.api.models;

public record TeamSearchInternalResponse(
        Long id,
        String name,
        String shortName,
        String clubId,
        String clubName,
        String clubCity,
        String logoUrl,
        String divisionName,
        String format,
        String gender,
        String season) {}
