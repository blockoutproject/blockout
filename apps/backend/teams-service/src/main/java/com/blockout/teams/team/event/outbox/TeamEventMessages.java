package com.blockout.teams.team.event.outbox;

import com.blockout.events.v2.model.TeamUpsertV2Event;
import com.blockout.teams.models.events.TeamUpsertEvent;

record TeamEventMessages(TeamUpsertEvent legacy, TeamUpsertV2Event canonical) {
}
