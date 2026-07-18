package com.blockout.teams.team.event.inbound;

import java.util.UUID;

record TeamDeactivationFact(UUID eventId, String eventType, Long teamId) {
}
