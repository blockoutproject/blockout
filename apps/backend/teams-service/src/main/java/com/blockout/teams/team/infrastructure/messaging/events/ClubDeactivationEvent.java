package com.blockout.teams.team.infrastructure.messaging.events;

/**
 * Command requesting the cascade deactivation of a Club's Teams.
 */
public record ClubDeactivationEvent(String clubId) {
}
