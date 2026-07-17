package com.blockout.competitions.lifecycle.application;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public record DeactivateCompetitionTeamsCommand(Long poolId, Set<Long> teamIds) {

    public DeactivateCompetitionTeamsCommand {
        teamIds = Collections.unmodifiableSet(new HashSet<>(teamIds));
    }
}
