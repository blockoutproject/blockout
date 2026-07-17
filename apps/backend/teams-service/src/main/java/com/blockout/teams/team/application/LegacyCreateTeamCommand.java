package com.blockout.teams.team.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import java.time.LocalDateTime;

public record LegacyCreateTeamCommand(
        Long id,
        String clubId,
        String rawName,
        String name,
        String shortName,
        String leagueCode,
        Long divisionId,
        String season,
        FormatEnum format,
        GenderEnum gender,
        Long followersCount,
        String logoUrl,
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime lastUpdate) {
}
