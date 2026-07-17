package com.blockout.pools.listeners;

import com.blockout.pools.config.RabbitMQConfig;
import com.blockout.pools.models.events.PoolDeactivationEvent;
import com.blockout.pools.pool.application.PoolService;

import lombok.RequiredArgsConstructor;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PoolListeners {

    private final PoolService poolService;

    @RabbitListener(queues = RabbitMQConfig.POOL_DEACTIVATION_QUEUE_POOLS)
    public void handlePoolDeactivation(PoolDeactivationEvent event) {
        Long poolId = event.getPoolId();
        poolService.deactivate(poolId);
    }
}
