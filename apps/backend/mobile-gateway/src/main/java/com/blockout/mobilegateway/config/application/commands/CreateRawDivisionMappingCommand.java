package com.blockout.mobilegateway.config.application.commands;

import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;

/** Values accepted when creating a raw Division mapping. */
public record CreateRawDivisionMappingCommand(
        String rawDivisionName,
        Long divisionId,
        Format format,
        Gender gender,
        String leagueCode,
        String season) {
}
