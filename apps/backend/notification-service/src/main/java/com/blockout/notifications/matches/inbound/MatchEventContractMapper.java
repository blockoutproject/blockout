package com.blockout.notifications.matches.inbound;

import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.MatchFinishedV2Event;
import com.blockout.events.v2.model.MatchLiveLinkCreatedV2Event;
import com.blockout.notifications.matches.application.MatchFinishedNotificationCommand;
import com.blockout.notifications.matches.application.MatchLiveLinkCreatedNotificationCommand;
import org.springframework.stereotype.Component;

/** Validates generated v2 match records and maps them to wire-independent commands. */
@Component
public class MatchEventContractMapper {

    private static final String PRODUCER = "matches-service";
    private static final String SCHEMA_VERSION = "2.0.0";

    public MatchFinishedNotificationCommand fromMatchFinished(MatchFinishedV2Event event) {
        requireEnvelope(event.eventId(), event.occurredAt(), event.producer(), event.schemaVersion(),
                event.aggregateVersion(), event.eventType(), EventType.MATCH_FINISHED);
        var payload = event.payload();
        var command = new MatchFinishedNotificationCommand(
                payload.matchId(), payload.teamIdA(), payload.teamIdB(), payload.poolId(), payload.set());
        requireOrderingKey(event.orderingKey(), command.matchId());
        return command;
    }

    public MatchLiveLinkCreatedNotificationCommand fromMatchLiveLinkCreated(MatchLiveLinkCreatedV2Event event) {
        requireEnvelope(event.eventId(), event.occurredAt(), event.producer(), event.schemaVersion(),
                event.aggregateVersion(), event.eventType(), EventType.MATCH_LIVE_LINK_CREATED);
        var payload = event.payload();
        var command = new MatchLiveLinkCreatedNotificationCommand(
                payload.matchId(), payload.teamIdA(), payload.teamIdB(), payload.poolId());
        requireOrderingKey(event.orderingKey(), command.matchId());
        return command;
    }

    private void requireEnvelope(
            Object eventId,
            Object occurredAt,
            String producer,
            String schemaVersion,
            Long aggregateVersion,
            EventType actualType,
            EventType expectedType) {
        if (eventId == null || occurredAt == null) {
            throw new IllegalArgumentException("Match event identity and occurrence time are required");
        }
        if (!PRODUCER.equals(producer)) {
            throw new IllegalArgumentException("Unexpected match event producer: " + producer);
        }
        if (!SCHEMA_VERSION.equals(schemaVersion)) {
            throw new IllegalArgumentException("Unsupported match schemaVersion: " + schemaVersion);
        }
        if (aggregateVersion != null) {
            throw new IllegalArgumentException("Match aggregateVersion must remain absent until a source exists");
        }
        if (actualType != expectedType) {
            throw new IllegalArgumentException("Unexpected match eventType: " + actualType);
        }
    }

    private void requireOrderingKey(String actual, Long matchId) {
        String expected = "match:%d".formatted(matchId);
        if (!expected.equals(actual)) {
            throw new IllegalArgumentException("Match orderingKey does not match its payload");
        }
    }
}
