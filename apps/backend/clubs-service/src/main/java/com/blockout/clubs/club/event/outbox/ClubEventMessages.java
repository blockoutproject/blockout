package com.blockout.clubs.club.event.outbox;

import com.blockout.events.v2.model.ClubUpsertV2Event;
import com.blockout.clubs.models.events.ClubUpsertEvent;

record ClubEventMessages(ClubUpsertEvent legacy, ClubUpsertV2Event canonical) {
}
