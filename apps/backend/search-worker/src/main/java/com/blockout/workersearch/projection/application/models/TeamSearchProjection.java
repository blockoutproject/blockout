package com.blockout.workersearch.projection.application.models;

public record TeamSearchProjection(
    Long id,
    String name,
    String shortName,
    String clubId,
    String clubName,
    String clubCity,
    String logoUrl,
    Long divisionId,
    String divisionName,
    String format,
    String gender,
    String season) {
}
