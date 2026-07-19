package com.blockout.pools.pool.infrastructure.messaging.events;

import com.blockout.pools.pool.application.models.Format;
import com.blockout.pools.pool.application.models.Gender;

/** Purpose-specific Pool search upsert message. */
public record PoolUpsertEvent(
        Long id, String name, String shortName, Long divisionId, String leagueCode,
        String leagueName, String season, Format format, Gender gender) {
}
