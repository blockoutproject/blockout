package com.blockout.workersearch.listeners.club;

import com.blockout.workersearch.config.RabbitMQConfig;
import com.blockout.workersearch.events.LifecycleEventDeduplicator;
import com.blockout.workersearch.events.LifecycleV2MessageDecoder;
import com.blockout.workersearch.models.events.ClubDeactivationEvent;
import com.blockout.workersearch.services.index.ClubIndexService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class ClubDeactivationListener {

    private static final Logger logger = LoggerFactory.getLogger(ClubDeactivationListener.class);
    private final ClubIndexService clubIndexService;
    private final LifecycleV2MessageDecoder decoder;
    private final LifecycleEventDeduplicator deduplicator;

    @RabbitListener(queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_SEARCH,
            autoStartup = "${blockout.events.consumers.lifecycle-v1-enabled:true}")
    public void onClubDeactivated(ClubDeactivationEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventIdHeader) {
        var eventId = deduplicator.legacyEventId(eventIdHeader);
        if (deduplicator.tryClaim(eventId, "CLUB_DEACTIVATED", "v1")) {
            apply(event, eventId, "v1");
        }
    }

    @RabbitListener(queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_SEARCH_V2,
            autoStartup = "${blockout.events.consumers.lifecycle-v2-enabled:false}")
    public void onClubDeactivatedV2(org.springframework.amqp.core.Message message) {
        var decoded = decoder.clubDeactivation(message);
        if (deduplicator.tryClaim(decoded.eventId(), decoded.eventType(), "v2")) {
            apply(decoded.projectionEvent(), decoded.eventId(), "v2");
        }
    }

    private void apply(ClubDeactivationEvent event, java.util.UUID eventId, String wireVersion) {
        String clubId = event.getClubId();
        
        logger.info("Received club deactivation event",
                keyValue("action", "club_deactivated"),
                keyValue("clubId", clubId));

        try {
            clubIndexService.delete(clubId);
            deduplicator.complete(eventId, "CLUB_DEACTIVATED", wireVersion);
        } catch (RuntimeException exception) {
            deduplicator.release(eventId);
            throw exception;
        }

        logger.info("Club deleted from index",
                keyValue("action", "club_index_delete"),
                keyValue("clubId", clubId));
    }
}
