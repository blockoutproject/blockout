package com.blockout.config.rawmapping.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

public record CreateRawDivisionMappingCommand(
        String rawDivisionName,
        Long divisionId,
        FormatEnum format,
        GenderEnum gender,
        String leagueCode,
        String season) {
}
