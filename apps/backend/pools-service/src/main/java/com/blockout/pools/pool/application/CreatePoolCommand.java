package com.blockout.pools.pool.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

public record CreatePoolCommand(
        String poolCode,
        String leagueCode,
        String season,
        String leagueName,
        String rawName,
        String name,
        String shortName,
        Long divisionId,
        FormatEnum format,
        GenderEnum gender) {
}
