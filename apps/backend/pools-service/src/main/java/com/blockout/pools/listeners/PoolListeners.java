package com.blockout.pools.listeners;

import com.blockout.pools.config.RabbitMQConfig;
import com.blockout.pools.models.events.PoolDeactivationEvent;
import com.blockout.pools.pool.application.PoolService;
import com.blockout.outbox.ConsumedEventProcessor;

import lombok.RequiredArgsConstructor;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.core.Message;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PoolListeners {

    private final PoolService poolService;
    private final PoolLifecycleV2MessageDecoder v2Decoder;
    private final ConsumedEventProcessor consumedEvents;

    @RabbitListener(
            queues = RabbitMQConfig.POOL_DEACTIVATION_QUEUE_POOLS,
            autoStartup = "${blockout.events.consumers.lifecycle-v1-enabled:true}")
    public void handlePoolDeactivation(
            PoolDeactivationEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventId) {
        Long poolId = event.getPoolId();
        consumedEvents.processLegacy(eventId, "POOL_DEACTIVATED", () -> poolService.deactivate(poolId));
    }

    @RabbitListener(
            queues = RabbitMQConfig.POOL_DEACTIVATION_QUEUE_POOLS_V2,
            autoStartup = "${blockout.events.consumers.lifecycle-v2-enabled:false}")
    public void handlePoolDeactivationV2(Message message) {
        var event = v2Decoder.decode(message);
        consumedEvents.processV2(event.eventId(), event.eventType().name(),
                () -> poolService.deactivate(event.payload().poolId()));
    }
}
