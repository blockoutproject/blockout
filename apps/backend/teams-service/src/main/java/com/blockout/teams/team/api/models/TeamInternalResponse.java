package com.blockout.teams.team.api.models;

import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;

import java.time.LocalDateTime;

/**
 * Complete Team representation owned by teams-service.
 */
public record TeamInternalResponse(
    Long id,
    String clubId,
    String rawName,
    String name,
    String shortName,
    String leagueCode,
    Long divisionId,
    String season,
    Format format,
    Gender gender,
    Long followersCount,
    String logoUrl,
    Boolean active,
    LocalDateTime createdAt,
    LocalDateTime lastUpdate) {
}
