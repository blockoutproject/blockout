package com.blockout.matches.match.infrastructure.messaging.events;

public record MatchFinishedEvent(Long id, Long teamIdA, Long teamIdB, Long poolId, String set) {
}
