package com.blockout.competitions.lifecycle.application;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public record DeactivateCompetitionPoolsCommand(Set<Long> poolIds) {

    public DeactivateCompetitionPoolsCommand {
        poolIds = Collections.unmodifiableSet(new HashSet<>(poolIds));
    }
}
