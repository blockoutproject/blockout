package com.blockout.teams.team.infrastructure.messaging.events;

import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;

/**
 * Purpose-specific Team search upsert message.
 */
public record TeamUpsertEvent(
    Long id,
    String name,
    String shortName,
    String clubId,
    Long divisionId,
    Format format,
    Gender gender,
    String season,
    String logoUrl) {
}
