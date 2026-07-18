package com.blockout.notifications.listeners;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.core.Message;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import com.blockout.events.v2.model.MatchLiveLinkCreatedV2Event;
import com.blockout.notifications.config.RabbitMQConfig;
import com.blockout.notifications.events.application.EventConsumption;
import com.blockout.notifications.events.inbound.V2EventMetadataValidator;
import com.blockout.notifications.matches.inbound.MatchEventContractMapper;
import com.blockout.notifications.models.events.MatchLiveLinkCreatedEvent;
import com.blockout.notifications.services.NotificationOrchestratorService;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class MatchLiveLinkCreatedListener {

    private static final Logger logger = LoggerFactory.getLogger(MatchLiveLinkCreatedListener.class);

    private final NotificationOrchestratorService orchestrator;
    private final MatchEventContractMapper mapper;
    private final EventConsumption consumedEvents;
    private final V2EventMetadataValidator metadataValidator;

    @RabbitListener(
            queues = RabbitMQConfig.MATCH_LIVE_LINK_CREATED_QUEUE,
            autoStartup = "${blockout.events.consumers.matches-v1-enabled:true}",
            ackMode = "AUTO")
    public void onMatchLiveLinkCreated(
            MatchLiveLinkCreatedEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventId) {
        Long matchId = event.getId();
        Long teamIdA = event.getTeamIdA();
        Long teamIdB = event.getTeamIdB();
        Long poolId = event.getPoolId();

        logger.info("Received match.live_link_created",
                keyValue("action", "match_live_link_created_received"),
                keyValue("matchId", matchId),
                keyValue("teamIdA", teamIdA),
                keyValue("teamIdB", teamIdB),
                keyValue("poolId", poolId));

        consumedEvents.processLegacy(eventId, "MATCH_LIVE_LINK_CREATED", () ->
                orchestrator.handleMatchLiveLinkCreated(matchId, teamIdA, teamIdB, poolId));
    }

    @RabbitListener(
            queues = RabbitMQConfig.MATCH_LIVE_LINK_CREATED_QUEUE_V2,
            autoStartup = "${blockout.events.consumers.matches-v2-enabled:false}",
            ackMode = "AUTO")
    public void onMatchLiveLinkCreatedV2(
            MatchLiveLinkCreatedV2Event event,
            Message message,
            @Header(name = "x-blockout-event-id") String eventId) {
        metadataValidator.validate(
                message.getMessageProperties(), event.eventId(), event.eventType().name(), event.occurredAt(),
                event.producer(), event.schemaVersion(), event.orderingKey(), event.aggregateVersion(),
                event.correlationId());
        var command = mapper.fromMatchLiveLinkCreated(event);
        consumedEvents.processV2(event.eventId(), eventId, event.eventType().name(), () ->
                orchestrator.handleMatchLiveLinkCreated(
                        command.matchId(), command.teamIdA(), command.teamIdB(), command.poolId()));
    }
}
