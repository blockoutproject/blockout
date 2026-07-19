package com.blockout.matches.match.infrastructure.messaging.events;

public record MatchLiveLinkCreatedEvent(Long id, Long teamIdA, Long teamIdB, Long poolId) {
}
