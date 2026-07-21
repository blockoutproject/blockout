package com.blockout.teams.team.infrastructure.messaging.events;

/**
 * Command requesting one Team deactivation.
 */
public record TeamDeactivationEvent(Long teamId) {
}
