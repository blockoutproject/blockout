package com.blockout.matches.services;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.events.v2.model.MatchFinishedV2Event;
import com.blockout.events.v2.model.MatchLiveLinkCreatedV2Event;
import com.blockout.matches.match.application.MatchFinishedEventInput;
import com.blockout.matches.match.live.application.MatchLiveLinkCreatedEventInput;
import com.blockout.matches.match.live.outbound.MatchLiveLinkEventContractMapper;
import com.blockout.matches.match.live.outbound.OutboxMatchLiveLinkEvents;
import com.blockout.matches.match.outbound.MatchEventContractMapper;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class EventPublisherTest {

    @Test
    void recordsMatchFactsWithSharedV1V2Identity() {
        Recorder recorder = new Recorder();
        EventPublisher publisher = new EventPublisher(recorder, new MatchEventContractMapper());
        OutboxMatchLiveLinkEvents liveEvents =
                new OutboxMatchLiveLinkEvents(recorder, new MatchLiveLinkEventContractMapper());

        publisher.publishMatchFinished(new MatchFinishedEventInput(10L, 11L, 12L, 13L, "3-1"));
        liveEvents.publishMatchLiveLinkCreated(new MatchLiveLinkCreatedEventInput(20L, 21L, 22L, 23L));

        assertThat(recorder.events).extracting(OutboxEvent::eventType)
                .containsExactly("MATCH_FINISHED", "MATCH_LIVE_LINK_CREATED");
        assertThat(recorder.events).extracting(OutboxEvent::v1RoutingKey)
                .containsExactly("match.finished", "match.live-link-created");
        assertThat(recorder.events).extracting(OutboxEvent::v2RoutingKey)
                .containsExactly("match.finished.v2", "match.live-link-created.v2");
        MatchFinishedV2Event finished = (MatchFinishedV2Event) recorder.events.getFirst().v2Payload();
        MatchLiveLinkCreatedV2Event live = (MatchLiveLinkCreatedV2Event) recorder.events.getLast().v2Payload();
        assertThat(finished.eventId()).isEqualTo(recorder.events.getFirst().metadata().eventId());
        assertThat(live.eventId()).isEqualTo(recorder.events.getLast().metadata().eventId());
        assertThat(finished.orderingKey()).isEqualTo("match:10");
        assertThat(live.orderingKey()).isEqualTo("match:20");
    }

    private static final class Recorder implements OutboxRecorder {
        private final List<OutboxEvent> events = new ArrayList<>();

        @Override
        public OutboxMetadata newMetadata() {
            return new OutboxMetadata(UUID.randomUUID(), OffsetDateTime.parse("2026-07-17T20:00Z"), null);
        }

        @Override
        public void record(OutboxEvent event) {
            events.add(event);
        }
    }
}
