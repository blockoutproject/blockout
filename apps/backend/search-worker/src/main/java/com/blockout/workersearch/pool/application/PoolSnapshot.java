package com.blockout.workersearch.pool.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

public record PoolSnapshot(
        Long id,
        String name,
        String shortName,
        Long divisionId,
        String leagueCode,
        String leagueName,
        String season,
        FormatEnum format,
        GenderEnum gender) {
}
