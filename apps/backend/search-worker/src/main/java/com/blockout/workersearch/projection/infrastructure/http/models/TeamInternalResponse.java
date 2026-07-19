package com.blockout.workersearch.projection.infrastructure.http.models;

import com.blockout.workersearch.projection.application.models.Format;
import com.blockout.workersearch.projection.application.models.Gender;
import java.time.LocalDateTime;

public record TeamInternalResponse(
        Long id,
        String clubId,
        String rawName,
        String name,
        String shortName,
        String season,
        LocalDateTime createdAt,
        LocalDateTime lastUpdate,
        String leagueCode,
        Long divisionId,
        Format format,
        Gender gender,
        Long followersCount,
        String logoUrl,
        Boolean active) {}
