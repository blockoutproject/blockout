package com.blockout.pools.listeners;

import com.blockout.pools.services.PoolService;
import com.blockout.shared.events.PoolDeactivatedEvent;
import com.blockout.pools.config.RabbitMQConfig;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class PoolDeactivationListener {

    @Autowired
    private PoolService poolService;

    @RabbitListener(queues = RabbitMQConfig.POOL_DEACTIVATED_QUEUE_POOLS)
    public void handlePoolDeactivated(PoolDeactivatedEvent event) {
        Long poolId = event.getPoolId();
        poolService.deactivatePool(poolId);
    }
}