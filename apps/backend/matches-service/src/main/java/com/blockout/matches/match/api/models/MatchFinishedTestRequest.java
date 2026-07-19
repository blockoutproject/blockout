package com.blockout.matches.match.api.models;

public record MatchFinishedTestRequest(Long id, Long teamIdA, Long teamIdB, Long poolId, String set) {
}
