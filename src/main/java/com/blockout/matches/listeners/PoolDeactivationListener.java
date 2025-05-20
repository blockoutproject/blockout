package com.blockout.matches.listeners;

import com.blockout.matches.services.MatchService;

import lombok.RequiredArgsConstructor;

import com.blockout.matches.config.RabbitMQConfig;
import com.blockout.matches.models.events.PoolDeactivationEvent;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PoolDeactivationListener {

    private final MatchService matchService;

    @RabbitListener(queues = RabbitMQConfig.POOL_DEACTIVATION_QUEUE_MATCHES)
    public void handlePoolDeactivation(PoolDeactivationEvent event) {
        Long poolId = event.getPoolId();
        matchService.deactivateMatchesByPoolId(poolId);
    }
}