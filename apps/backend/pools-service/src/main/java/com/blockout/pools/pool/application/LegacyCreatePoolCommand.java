package com.blockout.pools.pool.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import java.time.LocalDateTime;

public record LegacyCreatePoolCommand(
        Long id,
        String poolCode,
        String leagueCode,
        String season,
        String leagueName,
        String rawName,
        String name,
        String shortName,
        Long divisionId,
        FormatEnum format,
        GenderEnum gender,
        Long followersCount,
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime lastUpdate) {
}
