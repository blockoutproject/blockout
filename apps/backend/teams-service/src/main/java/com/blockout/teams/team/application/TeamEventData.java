package com.blockout.teams.team.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

public record TeamEventData(
        Long id,
        String name,
        String shortName,
        String clubId,
        Long divisionId,
        FormatEnum format,
        GenderEnum gender,
        String season,
        String logoUrl,
        boolean active,
        long revision) {

    public static TeamEventData from(TeamView team) {
        return new TeamEventData(
                team.id(),
                team.name(),
                team.shortName(),
                team.clubId(),
                team.divisionId(),
                team.format(),
                team.gender(),
                team.season(),
                team.logoUrl(),
                Boolean.TRUE.equals(team.active()),
                team.revision());
    }
}
