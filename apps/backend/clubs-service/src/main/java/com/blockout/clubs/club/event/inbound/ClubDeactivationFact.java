package com.blockout.clubs.club.event.inbound;

import java.util.UUID;

record ClubDeactivationFact(UUID eventId, String eventType, String clubId) {
}
