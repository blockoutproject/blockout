package com.blockout.teams.team.event.inbound;

import java.util.UUID;

record ClubDeactivationFact(UUID eventId, String eventType, String clubId) {
}
