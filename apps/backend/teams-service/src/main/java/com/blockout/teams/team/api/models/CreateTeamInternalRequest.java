package com.blockout.teams.team.api.models;

import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;

/** Handwritten request accepted by the internal V1 Team creation route. */
public record CreateTeamInternalRequest(
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
        Boolean active) {
}
