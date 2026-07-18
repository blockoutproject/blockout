package com.blockout.matches.match.live.outbound;

import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.MatchLiveLinkCreatedV2Event;
import com.blockout.events.v2.model.MatchLiveLinkCreatedV2Payload;
import com.blockout.matches.match.application.MatchEventMetadata;
import com.blockout.matches.match.live.application.MatchLiveLinkCreatedEventInput;
import org.springframework.stereotype.Component;

@Component
public class MatchLiveLinkEventContractMapper {

    private static final String PRODUCER = "matches-service";
    private static final String SCHEMA_VERSION = "2.0.0";

    public MatchLiveLinkCreatedV2Event toEvent(
            MatchLiveLinkCreatedEventInput input, MatchEventMetadata metadata) {
        requirePositive(input.matchId(), "matchId");
        requirePositive(input.teamIdA(), "teamIdA");
        requirePositive(input.teamIdB(), "teamIdB");
        requirePositive(input.poolId(), "poolId");
        return new MatchLiveLinkCreatedV2Event(
                null,
                metadata.correlationId(),
                metadata.eventId(),
                EventType.MATCH_LIVE_LINK_CREATED,
                metadata.occurredAt(),
                "match:" + input.matchId(),
                new MatchLiveLinkCreatedV2Payload(
                        input.matchId(), input.poolId(), input.teamIdA(), input.teamIdB()),
                PRODUCER,
                SCHEMA_VERSION);
    }

    private void requirePositive(Long value, String field) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(field + " must be a positive numeric ID");
        }
    }
}
