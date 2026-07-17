package com.blockout.matches.match.application;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

public record DeactivateMatchesCommand(Long poolId, Set<String> missingMatchCodes) {

    public DeactivateMatchesCommand {
        Objects.requireNonNull(missingMatchCodes, "missingMatchCodes");
        missingMatchCodes = Collections.unmodifiableSet(new HashSet<>(missingMatchCodes));
    }

    public static DeactivateMatchesCommand from(Long poolId, List<String> missingMatchCodes) {
        return new DeactivateMatchesCommand(poolId, new HashSet<>(missingMatchCodes));
    }
}
