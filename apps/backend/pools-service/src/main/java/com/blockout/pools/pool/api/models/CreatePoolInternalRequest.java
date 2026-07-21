package com.blockout.pools.pool.api.models;

import com.blockout.pools.pool.application.models.Format;
import com.blockout.pools.pool.application.models.Gender;

/**
 * Handwritten request accepted by the internal V1 Pool creation route.
 */
public record CreatePoolInternalRequest(
    String poolCode, String leagueCode, String season, String leagueName, String rawName,
    String name, String shortName, Long divisionId, Format format, Gender gender,
    Long followersCount, Boolean active) {
}
