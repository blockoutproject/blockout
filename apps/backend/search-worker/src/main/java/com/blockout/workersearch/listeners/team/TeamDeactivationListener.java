package com.blockout.workersearch.listeners.team;

import com.blockout.workersearch.config.RabbitMQConfig;
import com.blockout.workersearch.events.LifecycleEventDeduplicator;
import com.blockout.workersearch.events.LifecycleV2MessageDecoder;
import com.blockout.workersearch.models.events.TeamDeactivationEvent;
import com.blockout.workersearch.services.index.TeamIndexService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class TeamDeactivationListener {

    private static final Logger logger = LoggerFactory.getLogger(TeamDeactivationListener.class);
    private final TeamIndexService teamIndexService;
    private final LifecycleV2MessageDecoder decoder;
    private final LifecycleEventDeduplicator deduplicator;

    @RabbitListener(queues = RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_SEARCH,
            autoStartup = "${blockout.events.consumers.lifecycle-v1-enabled:true}")
    public void onTeamDeactivated(TeamDeactivationEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventIdHeader) {
        var eventId = deduplicator.legacyEventId(eventIdHeader);
        if (deduplicator.tryClaim(eventId, "TEAM_DEACTIVATED", "v1")) {
            apply(event, eventId, "v1");
        }
    }

    @RabbitListener(queues = RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_SEARCH_V2,
            autoStartup = "${blockout.events.consumers.lifecycle-v2-enabled:false}")
    public void onTeamDeactivatedV2(org.springframework.amqp.core.Message message) {
        var decoded = decoder.teamDeactivation(message);
        if (deduplicator.tryClaim(decoded.eventId(), decoded.eventType(), "v2")) {
            apply(decoded.projectionEvent(), decoded.eventId(), "v2");
        }
    }

    private void apply(TeamDeactivationEvent event, java.util.UUID eventId, String wireVersion) {
        Long teamId = event.getTeamId();

        logger.info("Received team deactivation event",
                keyValue("action", "team_deactivated"),
                keyValue("teamId", teamId));

        try {
            teamIndexService.delete(teamId);
            deduplicator.complete(eventId, "TEAM_DEACTIVATED", wireVersion);
        } catch (RuntimeException exception) {
            deduplicator.release(eventId);
            throw exception;
        }

        logger.info("Team deleted from index",
                keyValue("action", "team_index_delete"),
                keyValue("teamId", teamId));
    }
}
