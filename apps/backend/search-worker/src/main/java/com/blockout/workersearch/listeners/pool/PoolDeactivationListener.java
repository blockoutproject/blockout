package com.blockout.workersearch.listeners.pool;

import com.blockout.workersearch.config.RabbitMQConfig;
import com.blockout.workersearch.events.LifecycleEventDeduplicator;
import com.blockout.workersearch.events.LifecycleV2MessageDecoder;
import com.blockout.workersearch.models.events.PoolDeactivationEvent;
import com.blockout.workersearch.services.index.PoolIndexService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class PoolDeactivationListener {

    private static final Logger logger = LoggerFactory.getLogger(PoolDeactivationListener.class);
    private final PoolIndexService poolIndexService;
    private final LifecycleV2MessageDecoder decoder;
    private final LifecycleEventDeduplicator deduplicator;

    @RabbitListener(queues = RabbitMQConfig.POOL_DEACTIVATION_QUEUE_SEARCH,
            autoStartup = "${blockout.events.consumers.lifecycle-v1-enabled:true}")
    public void onPoolDeactivated(PoolDeactivationEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventIdHeader) {
        var eventId = deduplicator.legacyEventId(eventIdHeader);
        if (deduplicator.tryClaim(eventId, "POOL_DEACTIVATED", "v1")) {
            apply(event, eventId, "v1");
        }
    }

    @RabbitListener(queues = RabbitMQConfig.POOL_DEACTIVATION_QUEUE_SEARCH_V2,
            autoStartup = "${blockout.events.consumers.lifecycle-v2-enabled:false}")
    public void onPoolDeactivatedV2(org.springframework.amqp.core.Message message) {
        var decoded = decoder.poolDeactivation(message);
        if (deduplicator.tryClaim(decoded.eventId(), decoded.eventType(), "v2")) {
            apply(decoded.projectionEvent(), decoded.eventId(), "v2");
        }
    }

    private void apply(PoolDeactivationEvent event, java.util.UUID eventId, String wireVersion) {
        Long poolId = event.getPoolId();
        
        logger.info("Received pool deactivation event",
                keyValue("action", "pool_deactivated"),
                keyValue("poolId", poolId));

        try {
            poolIndexService.delete(poolId);
            deduplicator.complete(eventId, "POOL_DEACTIVATED", wireVersion);
        } catch (RuntimeException exception) {
            deduplicator.release(eventId);
            throw exception;
        }

        logger.info("Pool deleted from index",
                keyValue("action", "pool_index_delete"),
                keyValue("poolId", poolId));
    }
}
