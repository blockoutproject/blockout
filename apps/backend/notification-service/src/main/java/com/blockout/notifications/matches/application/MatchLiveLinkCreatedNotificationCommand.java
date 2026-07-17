package com.blockout.notifications.matches.application;

/** Validated live-link-created input independent from either Rabbit wire version. */
public record MatchLiveLinkCreatedNotificationCommand(Long matchId, Long teamIdA, Long teamIdB, Long poolId) {

    public MatchLiveLinkCreatedNotificationCommand {
        MatchNotificationValidation.requireMatch(matchId, teamIdA, teamIdB, poolId);
    }
}
