package com.blockout.matches.match.live.outbound;

import com.blockout.events.v2.model.EventType;
import com.blockout.matches.config.RabbitMQConfig;
import com.blockout.matches.match.application.MatchEventMetadata;
import com.blockout.matches.match.live.application.MatchLiveLinkCreatedEventInput;
import com.blockout.matches.match.live.application.MatchLiveLinkEvents;
import com.blockout.matches.models.events.MatchLiveLinkCreatedEvent;
import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OutboxMatchLiveLinkEvents implements MatchLiveLinkEvents {

    private static final String PRODUCER = "matches-service";
    private static final String VERSION = "2.0.0";

    private final OutboxRecorder outbox;
    private final MatchLiveLinkEventContractMapper contractMapper;

    @Override
    public void publishMatchLiveLinkCreated(MatchLiveLinkCreatedEventInput input) {
        OutboxMetadata metadata = outbox.newMetadata();
        var legacy = MatchLiveLinkCreatedEvent.builder()
                .id(input.matchId())
                .teamIdA(input.teamIdA())
                .teamIdB(input.teamIdB())
                .poolId(input.poolId())
                .build();
        var canonical = contractMapper.toEvent(input, metadata(metadata));
        outbox.record(new OutboxEvent(
                metadata,
                EventType.MATCH_LIVE_LINK_CREATED.getValue(),
                VERSION,
                PRODUCER,
                "match:" + input.matchId(),
                null,
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                RabbitMQConfig.RK_MATCH_LIVE_LINK_CREATED,
                legacy,
                RabbitMQConfig.RK_MATCH_LIVE_LINK_CREATED + ".v2",
                canonical));
    }

    private MatchEventMetadata metadata(OutboxMetadata metadata) {
        return new MatchEventMetadata(metadata.eventId(), metadata.occurredAt(), metadata.correlationId());
    }
}
