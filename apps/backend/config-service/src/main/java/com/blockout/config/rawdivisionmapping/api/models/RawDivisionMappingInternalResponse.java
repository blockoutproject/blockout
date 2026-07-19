package com.blockout.config.rawdivisionmapping.api.models;

import com.blockout.config.rawdivisionmapping.application.models.Format;
import com.blockout.config.rawdivisionmapping.application.models.Gender;

import java.time.LocalDateTime;

/** Complete V1 RawDivisionMapping response owned by config-service. */
public record RawDivisionMappingInternalResponse(
        Long id, String rawDivisionName, Long divisionId, Format format, Gender gender, String leagueCode, String season,
        LocalDateTime createdAt, LocalDateTime lastUpdate, boolean mapped) {
}
