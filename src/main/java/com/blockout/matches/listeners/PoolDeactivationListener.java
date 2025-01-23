package com.blockout.matches.listeners;

import com.blockout.matches.services.MatchService;
import com.blockout.shared.events.PoolDeactivatedEvent;
import com.blockout.matches.config.RabbitMQConfig;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class PoolDeactivationListener {

    @Autowired
    private MatchService matchService;

    @RabbitListener(queues = RabbitMQConfig.POOL_DEACTIVATED_QUEUE_MATCHES)
    public void handlePoolDeactivated(PoolDeactivatedEvent event) {
        Long poolId = event.getPoolId();
        matchService.deactivateMatchesByPoolId(poolId);
    }
}