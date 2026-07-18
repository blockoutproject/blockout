package com.blockout.teams.team.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

public record TeamUpsertFact(
        Long id, String name, String shortName, String clubId, Long divisionId,
        FormatEnum format, GenderEnum gender, String season, String logoUrl) {

    public static TeamUpsertFact from(TeamView team) {
        return new TeamUpsertFact(team.id(), team.name(), team.shortName(), team.clubId(), team.divisionId(),
                team.format(), team.gender(), team.season(), team.logoUrl());
    }
}
