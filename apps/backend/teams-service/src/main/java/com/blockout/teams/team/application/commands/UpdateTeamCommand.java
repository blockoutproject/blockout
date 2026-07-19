package com.blockout.teams.team.application.commands;

import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;

/** Application command for a partial Team update. */
public record UpdateTeamCommand(
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
        Boolean active,
        TeamImageCommand image) {
}
