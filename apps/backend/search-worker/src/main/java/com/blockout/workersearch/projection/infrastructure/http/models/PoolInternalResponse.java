package com.blockout.workersearch.projection.infrastructure.http.models;

import com.blockout.workersearch.projection.application.models.Format;
import com.blockout.workersearch.projection.application.models.Gender;

import java.time.LocalDateTime;

public record PoolInternalResponse(
    Long id,
    String poolCode,
    String leagueCode,
    String season,
    String leagueName,
    String rawName,
    String name,
    String shortName,
    Long divisionId,
    Format format,
    Gender gender,
    Long followersCount,
    Boolean active,
    LocalDateTime createdAt,
    LocalDateTime lastUpdate) {
}
