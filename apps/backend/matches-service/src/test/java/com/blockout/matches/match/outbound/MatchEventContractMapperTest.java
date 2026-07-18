package com.blockout.matches.match.outbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import com.blockout.events.v2.model.EventType;
import com.blockout.matches.match.application.MatchEventMetadata;
import com.blockout.matches.match.application.MatchFinishedEventInput;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MatchEventContractMapperTest {

    private static final UUID EVENT_ID = UUID.fromString("00000000-0000-4000-8000-000000000370");
    private static final OffsetDateTime OCCURRED_AT = OffsetDateTime.parse("2026-07-17T14:00:00Z");
    private final MatchEventContractMapper mapper = new MatchEventContractMapper();
    private final MatchEventMetadata metadata = new MatchEventMetadata(EVENT_ID, OCCURRED_AT, "migration-370");

    @Test
    void mapsFinishedFactsToGeneratedEnvelopes() {
        var finished = mapper.toMatchFinished(new MatchFinishedEventInput(5L, 2L, 6L, 4L, "2-1"), metadata);

        assertThat(finished.eventType()).isEqualTo(EventType.MATCH_FINISHED);
        assertThat(finished.payload().matchId()).isEqualTo(5L);
        assertThat(finished.payload().set()).isEqualTo("2-1");
        assertThat(finished.orderingKey()).isEqualTo("match:5");
        assertThat(finished.producer()).isEqualTo("matches-service");
        assertThat(finished.schemaVersion()).isEqualTo("2.0.0");
        assertThat(finished.aggregateVersion()).isNull();
    }

    @Test
    void rejectsMissingFactsAndBlankMetadata() {
        assertThatIllegalArgumentException().isThrownBy(() -> mapper.toMatchFinished(
                new MatchFinishedEventInput(5L, 2L, 6L, 4L, " "), metadata));
        assertThatIllegalArgumentException().isThrownBy(() -> new MatchEventMetadata(EVENT_ID, OCCURRED_AT, " "));
    }
}
