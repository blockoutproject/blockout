package com.blockout.matches.match.live.outbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import com.blockout.events.v2.model.EventType;
import com.blockout.matches.match.application.MatchEventMetadata;
import com.blockout.matches.match.live.application.MatchLiveLinkCreatedEventInput;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MatchLiveLinkEventContractMapperTest {

    private static final MatchEventMetadata METADATA = new MatchEventMetadata(
            UUID.fromString("00000000-0000-4000-8000-000000000423"),
            OffsetDateTime.parse("2026-07-17T14:00:00Z"),
            "migration-423");
    private final MatchLiveLinkEventContractMapper mapper = new MatchLiveLinkEventContractMapper();

    @Test
    void mapsLiveLinkFactsToTheGeneratedEnvelope() {
        var event = mapper.toEvent(new MatchLiveLinkCreatedEventInput(5L, 2L, 6L, 4L), METADATA);

        assertThat(event.eventType()).isEqualTo(EventType.MATCH_LIVE_LINK_CREATED);
        assertThat(event.payload().matchId()).isEqualTo(5L);
        assertThat(event.orderingKey()).isEqualTo("match:5");
        assertThat(event.producer()).isEqualTo("matches-service");
        assertThat(event.schemaVersion()).isEqualTo("2.0.0");
        assertThat(event.aggregateVersion()).isNull();
    }

    @Test
    void rejectsMissingLiveLinkFacts() {
        assertThatIllegalArgumentException().isThrownBy(() -> mapper.toEvent(
                new MatchLiveLinkCreatedEventInput(0L, 2L, 6L, 4L), METADATA));
    }
}
