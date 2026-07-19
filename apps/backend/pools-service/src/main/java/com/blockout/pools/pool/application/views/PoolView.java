package com.blockout.pools.pool.application.views;

import com.blockout.pools.pool.application.models.Format;
import com.blockout.pools.pool.application.models.Gender;
import java.time.LocalDateTime;

/** Complete application view of a Pool. */
public record PoolView(
        Long id, String poolCode, String leagueCode, String season, String leagueName, String rawName,
        String name, String shortName, Long divisionId, Format format, Gender gender,
        Long followersCount, Boolean active, LocalDateTime createdAt, LocalDateTime lastUpdate) {
}
