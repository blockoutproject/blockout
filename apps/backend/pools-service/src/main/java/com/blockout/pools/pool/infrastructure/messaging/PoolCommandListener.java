package com.blockout.pools.pool.infrastructure.messaging;

import com.blockout.pools.config.RabbitMQConfig;
import com.blockout.pools.pool.application.PoolService;
import com.blockout.pools.pool.infrastructure.messaging.events.PoolDeactivationEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Consumes Pool deactivation commands.
 */
@Component
@RequiredArgsConstructor
public class PoolCommandListener {
    private final PoolService poolService;

    @RabbitListener(queues = RabbitMQConfig.POOL_DEACTIVATION_QUEUE_POOLS)
    public void handlePoolDeactivation(PoolDeactivationEvent event) {
        poolService.deactivatePool(event.poolId());
    }
}
