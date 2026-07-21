package com.blockout.search.search.application.views;

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
