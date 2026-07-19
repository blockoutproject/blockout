package com.blockout.config.rawdivisionmapping.application.views;

import com.blockout.config.rawdivisionmapping.application.models.Format;
import com.blockout.config.rawdivisionmapping.application.models.Gender;

import java.time.LocalDateTime;

/** Authoritative application view of a RawDivisionMapping. */
public record RawDivisionMappingView(
        Long id, String rawDivisionName, Long divisionId, Format format, Gender gender, String leagueCode, String season,
        LocalDateTime createdAt, LocalDateTime lastUpdate, boolean mapped) {
}
