package com.blockout.matches.match.outbound;

import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.MatchFinishedV2Event;
import com.blockout.events.v2.model.MatchFinishedV2Payload;
import com.blockout.events.v2.model.MatchLiveLinkCreatedV2Event;
import com.blockout.events.v2.model.MatchLiveLinkCreatedV2Payload;
import com.blockout.matches.match.application.MatchEventMetadata;
import com.blockout.matches.match.application.MatchFinishedEventInput;
import com.blockout.matches.match.live.application.MatchLiveLinkCreatedEventInput;
import org.springframework.stereotype.Component;

/** Maps audited match facts to generated v2 records without publishing them before MRG-372. */
@Component
public class MatchEventContractMapper {

    private static final String PRODUCER = "matches-service";
    private static final String SCHEMA_VERSION = "2.0.0";

    public MatchFinishedV2Event toMatchFinished(MatchFinishedEventInput input, MatchEventMetadata metadata) {
        requireMatch(input.matchId(), input.teamIdA(), input.teamIdB(), input.poolId());
        if (input.set() == null || input.set().isBlank()) {
            throw new IllegalArgumentException("set must be non-blank");
        }
        return new MatchFinishedV2Event(
                null,
                metadata.correlationId(),
                metadata.eventId(),
                EventType.MATCH_FINISHED,
                metadata.occurredAt(),
                orderingKey(input.matchId()),
                new MatchFinishedV2Payload(
                        input.matchId(), input.poolId(), input.set(), input.teamIdA(), input.teamIdB()),
                PRODUCER,
                SCHEMA_VERSION);
    }

    public MatchLiveLinkCreatedV2Event toMatchLiveLinkCreated(
            MatchLiveLinkCreatedEventInput input, MatchEventMetadata metadata) {
        requireMatch(input.matchId(), input.teamIdA(), input.teamIdB(), input.poolId());
        return new MatchLiveLinkCreatedV2Event(
                null,
                metadata.correlationId(),
                metadata.eventId(),
                EventType.MATCH_LIVE_LINK_CREATED,
                metadata.occurredAt(),
                orderingKey(input.matchId()),
                new MatchLiveLinkCreatedV2Payload(
                        input.matchId(), input.poolId(), input.teamIdA(), input.teamIdB()),
                PRODUCER,
                SCHEMA_VERSION);
    }

    private String orderingKey(Long matchId) {
        return "match:%d".formatted(matchId);
    }

    private void requireMatch(Long matchId, Long teamIdA, Long teamIdB, Long poolId) {
        requirePositive(matchId, "matchId");
        requirePositive(teamIdA, "teamIdA");
        requirePositive(teamIdB, "teamIdB");
        requirePositive(poolId, "poolId");
    }

    private void requirePositive(Long value, String field) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(field + " must be a positive numeric ID");
        }
    }
}
