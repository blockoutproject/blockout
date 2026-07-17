package com.blockout.config.rawmapping.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import java.time.LocalDateTime;

public record LegacyRawDivisionMappingSeed(
        Long id,
        String rawDivisionName,
        Long divisionId,
        FormatEnum format,
        GenderEnum gender,
        String leagueCode,
        String season,
        LocalDateTime createdAt,
        LocalDateTime lastUpdate) {
}
