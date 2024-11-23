package com.blockout.pools.services;

import com.blockout.pools.config.RabbitMQConfig;
import com.blockout.shared.events.PoolDeactivatedEvent;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class EventPublisher {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void publishPoolDeactivationEvent(Long poolId) {
        PoolDeactivatedEvent event = new PoolDeactivatedEvent(poolId);
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.POOL_DEACTIVATED_EXCHANGE,
                "",
                event
        );
    }
}