package com.blockout.teams.team.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import java.util.List;

public record TeamFilter(
        Long divisionId,
        FormatEnum format,
        GenderEnum gender,
        String season,
        String clubId,
        List<Long> ids,
        Boolean active) {

    public TeamFilter {
        ids = ids == null ? List.of() : List.copyOf(ids);
    }
}
