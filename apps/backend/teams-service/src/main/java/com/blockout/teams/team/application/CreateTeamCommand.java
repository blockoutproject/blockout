package com.blockout.teams.team.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

public record CreateTeamCommand(
        String clubId,
        String rawName,
        String name,
        String shortName,
        String leagueCode,
        Long divisionId,
        String season,
        FormatEnum format,
        GenderEnum gender) {
}
