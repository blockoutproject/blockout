package com.blockout.pools.listeners;

import com.blockout.pools.config.RabbitMQConfig;
import com.blockout.pools.models.EntityType;
import com.blockout.pools.services.PoolService;
import com.blockout.shared.events.PoolDeactivatedEvent;
import com.blockout.shared.events.UserFollowEvent;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class PoolListeners {

    private final PoolService poolService;
    private static final Logger logger = LoggerFactory.getLogger(PoolService.class);

    public PoolListeners(PoolService poolService) {
        this.poolService = poolService;
    }

    @RabbitListener(queues = RabbitMQConfig.POOL_DEACTIVATED_QUEUE_POOLS)
    public void handlePoolDeactivated(PoolDeactivatedEvent event) {
        Long poolId = event.getPoolId();
        poolService.deactivatePool(poolId);
    }

    @RabbitListener(queues = RabbitMQConfig.POOL_FOLLOW_QUEUE)
    public void handleFollowEvent(UserFollowEvent event) {
        if (event.getEntityType() != EntityType.TEAM) {
            logger.error("Received event for non-pool entity type: {}", event.getEntityType());
            return;
        }
    
        switch (event.getEventType()) {
            case CREATED -> poolService.incrementFollowersCount(event.getEntityId(), event.getUserId());
            case DELETED -> poolService.decrementFollowersCount(event.getEntityId(), event.getUserId());
        }
    }
}