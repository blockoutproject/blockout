package com.blockout.teams.team.api.models;

import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;

/**
 * Handwritten partial-update request accepted by the internal V1 Team API.
 */
public record UpdateTeamInternalRequest(
    String clubId,
    String rawName,
    String name,
    String shortName,
    String leagueCode,
    Long divisionId,
    String logoUrl,
    String season,
    Format format,
    Gender gender,
    Boolean active) {
}
