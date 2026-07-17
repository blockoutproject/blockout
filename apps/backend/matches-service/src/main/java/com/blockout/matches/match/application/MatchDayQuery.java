package com.blockout.matches.match.application;

import com.blockout.shared.model.MatchStatusEnum;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public record MatchDayQuery(
        List<Long> poolIds,
        List<Long> teamIds,
        MatchStatusEnum status,
        int page,
        int pageSize,
        Boolean active) {

    public MatchDayQuery {
        poolIds = poolIds == null
                ? List.of()
                : Collections.unmodifiableList(new ArrayList<>(poolIds));
        teamIds = teamIds == null
                ? List.of()
                : Collections.unmodifiableList(new ArrayList<>(teamIds));
    }
}
