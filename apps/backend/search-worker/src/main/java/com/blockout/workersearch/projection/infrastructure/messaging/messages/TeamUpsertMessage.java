package com.blockout.workersearch.projection.infrastructure.messaging.messages;

import com.blockout.workersearch.projection.application.models.Format;
import com.blockout.workersearch.projection.application.models.Gender;

public record TeamUpsertMessage(
        Long id,
        String name,
        String shortName,
        String clubId,
        Long divisionId,
        Format format,
        Gender gender,
        String season,
        String logoUrl) {}
