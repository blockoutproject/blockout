package com.blockout.notifications.listeners;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.core.Message;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import com.blockout.events.v2.model.MatchFinishedV2Event;
import com.blockout.notifications.config.RabbitMQConfig;
import com.blockout.notifications.events.ConsumedEventProcessor;
import com.blockout.notifications.events.V2EventMetadataValidator;
import com.blockout.notifications.matches.inbound.MatchEventContractMapper;
import com.blockout.notifications.models.events.MatchFinishedEvent;
import com.blockout.notifications.services.NotificationOrchestratorService;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class MatchFinishedListener {

    private static final Logger logger = LoggerFactory.getLogger(MatchFinishedListener.class);

    private final NotificationOrchestratorService orchestrator;
    private final MatchEventContractMapper mapper;
    private final ConsumedEventProcessor consumedEvents;
    private final V2EventMetadataValidator metadataValidator;

    @RabbitListener(
            queues = RabbitMQConfig.MATCH_FINISHED_QUEUE,
            autoStartup = "${blockout.events.consumers.matches-v1-enabled:true}")
    public void onMatchFinished(
            MatchFinishedEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventId) {
        Long matchId = event.getId();
        Long teamIdA = event.getTeamIdA();
        Long teamIdB = event.getTeamIdB();
        Long poolId = event.getPoolId();
        String set = event.getSet();

        logger.info("Received match.finished",
                keyValue("action", "match_finished_received"),
                keyValue("matchId", matchId),
                keyValue("set", set),
                keyValue("teamIdA", event.getTeamIdA()),
                keyValue("teamIdB", event.getTeamIdB()),
                keyValue("poolId", event.getPoolId()));

        consumedEvents.processLegacy(eventId, "MATCH_FINISHED", () ->
                orchestrator.handleMatchFinished(matchId, teamIdA, teamIdB, poolId, set));
    }

    @RabbitListener(
            queues = RabbitMQConfig.MATCH_FINISHED_QUEUE_V2,
            autoStartup = "${blockout.events.consumers.matches-v2-enabled:false}")
    public void onMatchFinishedV2(
            MatchFinishedV2Event event,
            Message message,
            @Header(name = "x-blockout-event-id") String eventId) {
        metadataValidator.validate(
                message.getMessageProperties(), event.eventId(), event.eventType().name(), event.occurredAt(),
                event.producer(), event.schemaVersion(), event.orderingKey(), event.aggregateVersion(),
                event.correlationId());
        var command = mapper.fromMatchFinished(event);
        consumedEvents.processV2(event.eventId(), eventId, event.eventType().name(), () ->
                orchestrator.handleMatchFinished(
                        command.matchId(), command.teamIdA(), command.teamIdB(), command.poolId(), command.set()));
    }
}
