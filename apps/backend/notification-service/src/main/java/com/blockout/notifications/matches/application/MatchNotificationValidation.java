package com.blockout.notifications.matches.application;

final class MatchNotificationValidation {

    private MatchNotificationValidation() {
    }

    static void requireMatch(Long matchId, Long teamIdA, Long teamIdB, Long poolId) {
        requirePositive(matchId, "matchId");
        requirePositive(teamIdA, "teamIdA");
        requirePositive(teamIdB, "teamIdB");
        requirePositive(poolId, "poolId");
    }

    private static void requirePositive(Long value, String field) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(field + " must be a positive numeric ID");
        }
    }
}
