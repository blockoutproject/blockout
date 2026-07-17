package com.blockout.notifications.matches.application;

/** Validated match-finished input independent from either Rabbit wire version. */
public record MatchFinishedNotificationCommand(
        Long matchId, Long teamIdA, Long teamIdB, Long poolId, String set) {

    public MatchFinishedNotificationCommand {
        MatchNotificationValidation.requireMatch(matchId, teamIdA, teamIdB, poolId);
        if (set == null || set.isBlank()) {
            throw new IllegalArgumentException("set must be non-blank");
        }
    }
}
