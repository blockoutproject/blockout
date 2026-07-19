package com.blockout.competitions.association.infrastructure.messaging.events;

public record TeamDeactivationByPoolEvent(Long teamId, Long poolId) {
}
