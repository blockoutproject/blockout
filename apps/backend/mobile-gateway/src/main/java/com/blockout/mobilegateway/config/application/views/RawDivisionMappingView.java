package com.blockout.mobilegateway.config.application.views;

import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;

import java.time.LocalDateTime;

/** Raw Division mapping projection used by the gateway application layer. */
public record RawDivisionMappingView(
        Long id,
        String rawDivisionName,
        Long divisionId,
        Format format,
        Gender gender,
        String leagueCode,
        String season,
        LocalDateTime createdAt,
        LocalDateTime lastUpdate,
        boolean mapped) {
}
