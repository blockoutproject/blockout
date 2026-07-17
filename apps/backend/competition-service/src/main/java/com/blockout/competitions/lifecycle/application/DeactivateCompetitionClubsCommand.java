package com.blockout.competitions.lifecycle.application;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public record DeactivateCompetitionClubsCommand(Set<String> clubIds) {

    public DeactivateCompetitionClubsCommand {
        clubIds = Collections.unmodifiableSet(new HashSet<>(clubIds));
    }
}
