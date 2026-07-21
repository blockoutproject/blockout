package com.blockout.workersearch.projection.infrastructure.messaging.messages;

import com.blockout.workersearch.projection.application.models.Format;
import com.blockout.workersearch.projection.application.models.Gender;

public record PoolUpsertMessage(
    Long id,
    String name,
    String shortName,
    Long divisionId,
    String leagueCode,
    String leagueName,
    String season,
    Format format,
    Gender gender) {
}
