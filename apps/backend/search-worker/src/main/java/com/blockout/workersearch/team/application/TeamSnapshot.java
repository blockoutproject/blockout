package com.blockout.workersearch.team.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

public record TeamSnapshot(
        Long id,
        String name,
        String shortName,
        String clubId,
        Long divisionId,
        FormatEnum format,
        GenderEnum gender,
        String season,
        String logoUrl) {
}
