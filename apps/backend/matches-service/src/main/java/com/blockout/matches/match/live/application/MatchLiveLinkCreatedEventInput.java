package com.blockout.matches.match.live.application;

public record MatchLiveLinkCreatedEventInput(Long matchId, Long teamIdA, Long teamIdB, Long poolId) {
}
