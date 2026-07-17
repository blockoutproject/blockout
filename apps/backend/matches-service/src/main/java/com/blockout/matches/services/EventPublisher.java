package com.blockout.matches.services;

import com.blockout.events.v2.model.EventType;
import com.blockout.matches.config.RabbitMQConfig;
import com.blockout.matches.match.application.MatchEventMetadata;
import com.blockout.matches.match.application.MatchFinishedEventInput;
import com.blockout.matches.match.application.MatchLifecycleEvents;
import com.blockout.matches.match.live.application.MatchLiveLinkCreatedEventInput;
import com.blockout.matches.match.live.application.MatchLiveLinkEvents;
import com.blockout.matches.match.outbound.MatchEventContractMapper;
import com.blockout.matches.models.events.MatchFinishedEvent;
import com.blockout.matches.models.events.MatchLiveLinkCreatedEvent;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Records match facts atomically; Rabbit publication is owned by the shared outbox job. */
@Service
@RequiredArgsConstructor
public class EventPublisher implements MatchLifecycleEvents, MatchLiveLinkEvents {

    private static final String PRODUCER = "matches-service";
    private static final String VERSION = "2.0.0";

    private final OutboxRecorder outbox;
    private final MatchEventContractMapper contractMapper;

    @Override
    public void publishMatchFinished(MatchFinishedEventInput input) {
        OutboxMetadata metadata = outbox.newMetadata();
        var legacy = MatchFinishedEvent.builder()
                .id(input.matchId()).teamIdA(input.teamIdA()).teamIdB(input.teamIdB())
                .poolId(input.poolId()).set(input.set()).build();
        var canonical = contractMapper.toMatchFinished(input, metadata(metadata));
        record(metadata, EventType.MATCH_FINISHED, "match:" + input.matchId(), RabbitMQConfig.RK_MATCH_FINISHED,
                legacy, RabbitMQConfig.RK_MATCH_FINISHED + ".v2", canonical);
    }

    @Override
    public void publishMatchLiveLinkCreated(MatchLiveLinkCreatedEventInput input) {
        OutboxMetadata metadata = outbox.newMetadata();
        var legacy = MatchLiveLinkCreatedEvent.builder()
                .id(input.matchId()).teamIdA(input.teamIdA()).teamIdB(input.teamIdB()).poolId(input.poolId()).build();
        var canonical = contractMapper.toMatchLiveLinkCreated(input, metadata(metadata));
        record(metadata, EventType.MATCH_LIVE_LINK_CREATED, "match:" + input.matchId(),
                RabbitMQConfig.RK_MATCH_LIVE_LINK_CREATED, legacy,
                RabbitMQConfig.RK_MATCH_LIVE_LINK_CREATED + ".v2", canonical);
    }

    private MatchEventMetadata metadata(OutboxMetadata metadata) {
        return new MatchEventMetadata(metadata.eventId(), metadata.occurredAt(), metadata.correlationId());
    }

    private void record(
            OutboxMetadata metadata,
            EventType eventType,
            String orderingKey,
            String v1Route,
            Object v1Payload,
            String v2Route,
            Object v2Payload) {
        outbox.record(new OutboxEvent(
                metadata, eventType.getValue(), VERSION, PRODUCER, orderingKey, null,
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, v1Route, v1Payload, v2Route, v2Payload));
    }
}
