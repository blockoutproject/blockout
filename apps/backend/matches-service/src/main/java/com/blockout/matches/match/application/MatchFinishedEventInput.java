package com.blockout.matches.match.application;

public record MatchFinishedEventInput(
        Long matchId,
        Long teamIdA,
        Long teamIdB,
        Long poolId,
        String set) {
}
