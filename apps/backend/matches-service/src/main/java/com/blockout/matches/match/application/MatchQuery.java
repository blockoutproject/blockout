package com.blockout.matches.match.application;

import com.blockout.shared.model.MatchStatusEnum;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public record MatchQuery(
        Long poolId,
        List<Long> teamIds,
        MatchStatusEnum status,
        Boolean active) {

    public MatchQuery {
        teamIds = teamIds == null
                ? List.of()
                : Collections.unmodifiableList(new ArrayList<>(teamIds));
    }
}
