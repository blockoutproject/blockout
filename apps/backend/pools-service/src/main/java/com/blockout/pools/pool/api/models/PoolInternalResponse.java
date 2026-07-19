package com.blockout.pools.pool.api.models;

import com.blockout.pools.pool.application.models.Format;
import com.blockout.pools.pool.application.models.Gender;
import java.time.LocalDateTime;

/** Complete Pool representation owned by pools-service. */
public record PoolInternalResponse(
        Long id, String poolCode, String leagueCode, String season, String leagueName, String rawName,
        String name, String shortName, Long divisionId, Format format, Gender gender,
        Long followersCount, Boolean active, LocalDateTime createdAt, LocalDateTime lastUpdate) {
}
