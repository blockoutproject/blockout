package com.blockout.teams.team.application.views;

import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;

import java.time.LocalDateTime;

/** Complete application view of a Team. */
public record TeamView(
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
