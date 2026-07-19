package com.blockout.teams.team.application.commands;

import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;

/** Application command for Team creation. */
public record CreateTeamCommand(
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
