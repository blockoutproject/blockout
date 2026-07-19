package com.blockout.pools.pool.application.commands;

import com.blockout.pools.pool.application.models.Format;
import com.blockout.pools.pool.application.models.Gender;

/** Application command for a partial Pool update. */
public record UpdatePoolCommand(
        String poolCode, String leagueCode, String season, String leagueName, String rawName,
        String name, String shortName, Long divisionId, Format format, Gender gender, Boolean active) {
}
