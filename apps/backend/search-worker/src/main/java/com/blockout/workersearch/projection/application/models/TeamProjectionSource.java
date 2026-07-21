package com.blockout.workersearch.projection.application.models;

public record TeamProjectionSource(
    Long id,
    String name,
    String shortName,
    String clubId,
    Long divisionId,
    Format format,
    Gender gender,
    String season,
    String logoUrl) {
}
