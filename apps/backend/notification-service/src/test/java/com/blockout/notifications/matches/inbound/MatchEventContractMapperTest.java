package com.blockout.notifications.matches.inbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.MatchFinishedV2Event;
import com.blockout.events.v2.model.MatchFinishedV2Payload;
import com.blockout.events.v2.model.MatchLiveLinkCreatedV2Event;
import com.blockout.events.v2.model.MatchLiveLinkCreatedV2Payload;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MatchEventContractMapperTest {

    private static final UUID EVENT_ID = UUID.fromString("00000000-0000-4000-8000-000000000370");
    private static final OffsetDateTime OCCURRED_AT = OffsetDateTime.parse("2026-07-17T14:00:00Z");
    private final MatchEventContractMapper mapper = new MatchEventContractMapper();

    @Test
    void mapsBothGeneratedEventsToWireIndependentCommands() {
        var finished = mapper.fromMatchFinished(finished(EventType.MATCH_FINISHED, "match:5", null, "2.0.0"));
        var live = mapper.fromMatchLiveLinkCreated(live(EventType.MATCH_LIVE_LINK_CREATED, "match:5"));

        assertThat(finished.matchId()).isEqualTo(5L);
        assertThat(finished.teamIdA()).isEqualTo(2L);
        assertThat(finished.teamIdB()).isEqualTo(6L);
        assertThat(finished.poolId()).isEqualTo(4L);
        assertThat(finished.set()).isEqualTo("2-1");
        assertThat(live.matchId()).isEqualTo(5L);
    }

    @Test
    void rejectsTypeOrderingVersionAggregateAndIdentifierContradictions() {
        assertThatIllegalArgumentException().isThrownBy(() ->
                mapper.fromMatchFinished(finished(EventType.MATCH_LIVE_LINK_CREATED, "match:5", null, "2.0.0")));
        assertThatIllegalArgumentException().isThrownBy(() ->
                mapper.fromMatchFinished(finished(EventType.MATCH_FINISHED, "match:6", null, "2.0.0")));
        assertThatIllegalArgumentException().isThrownBy(() ->
                mapper.fromMatchFinished(finished(EventType.MATCH_FINISHED, "match:5", null, "3.0.0")));
        assertThatIllegalArgumentException().isThrownBy(() ->
                mapper.fromMatchFinished(finished(EventType.MATCH_FINISHED, "match:5", 1L, "2.0.0")));
        assertThatIllegalArgumentException().isThrownBy(() -> mapper.fromMatchFinished(new MatchFinishedV2Event(
                null, "migration-370", EVENT_ID, EventType.MATCH_FINISHED, OCCURRED_AT, "match:5",
                new MatchFinishedV2Payload(5L, 4L, "2-1", 2L, 6L), "users-service", "2.0.0")));
        assertThatIllegalArgumentException().isThrownBy(() -> mapper.fromMatchLiveLinkCreated(new MatchLiveLinkCreatedV2Event(
                null, "migration-370", EVENT_ID, EventType.MATCH_LIVE_LINK_CREATED, OCCURRED_AT, "match:0",
                new MatchLiveLinkCreatedV2Payload(0L, 4L, 2L, 6L), "matches-service", "2.0.0")));
    }

    private MatchFinishedV2Event finished(EventType type, String orderingKey, Long aggregateVersion, String version) {
        return new MatchFinishedV2Event(
                aggregateVersion, "migration-370", EVENT_ID, type, OCCURRED_AT, orderingKey,
                new MatchFinishedV2Payload(5L, 4L, "2-1", 2L, 6L), "matches-service", version);
    }

    private MatchLiveLinkCreatedV2Event live(EventType type, String orderingKey) {
        return new MatchLiveLinkCreatedV2Event(
                null, "migration-370", EVENT_ID, type, OCCURRED_AT, orderingKey,
                new MatchLiveLinkCreatedV2Payload(5L, 4L, 2L, 6L), "matches-service", "2.0.0");
    }
}
