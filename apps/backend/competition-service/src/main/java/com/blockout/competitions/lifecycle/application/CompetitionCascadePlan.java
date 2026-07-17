package com.blockout.competitions.lifecycle.application;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public record CompetitionCascadePlan(Set<Long> poolIds, Set<Long> teamIds, Set<String> clubIds) {

    public CompetitionCascadePlan {
        poolIds = Collections.unmodifiableSet(new HashSet<>(poolIds));
        teamIds = Collections.unmodifiableSet(new HashSet<>(teamIds));
        clubIds = Collections.unmodifiableSet(new HashSet<>(clubIds));
    }
}
