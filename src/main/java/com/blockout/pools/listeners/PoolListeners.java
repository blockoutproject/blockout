package com.blockout.pools.listeners;

import com.blockout.pools.config.RabbitMQConfig;
import com.blockout.pools.services.PoolService;
import com.blockout.shared.events.PoolDeactivatedEvent;
import com.blockout.shared.events.UserFollowCreatedEvent;
import com.blockout.shared.events.UserFollowDeletedEvent;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class PoolListeners {

    private final PoolService poolService;

    public PoolListeners(PoolService poolService) {
        this.poolService = poolService;
    }

    @RabbitListener(queues = RabbitMQConfig.POOL_DEACTIVATED_QUEUE_POOLS)
    public void handlePoolDeactivated(PoolDeactivatedEvent event) {
        Long poolId = event.getPoolId();
        poolService.deactivatePool(poolId);
    }

    @RabbitListener(queues = RabbitMQConfig.POOL_FOLLOW_QUEUE)
    public void handleFollowCreated(UserFollowCreatedEvent event) {
        switch (event.getEntityType()) {
            case POOL -> poolService.incrementFollowersCount(event.getEntityId(), event.getUserId());
            default -> {}
        }
    }

    @RabbitListener(queues = RabbitMQConfig.POOL_FOLLOW_QUEUE)
    public void handleFollowDeleted(UserFollowDeletedEvent event) {
        switch (event.getEntityType()) {
            case POOL -> poolService.decrementFollowersCount(event.getEntityId(), event.getUserId());
            default -> {}
        }
    }
}