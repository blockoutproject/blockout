package com.blockout.search.team.application;

/** Application-owned team autocomplete projection, including retained v1 fields. */
public record TeamSearchResult(
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
        String season) {
}
