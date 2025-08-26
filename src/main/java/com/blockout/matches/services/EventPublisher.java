package com.blockout.matches.services;

import com.blockout.matches.config.RabbitMQConfig;
import com.blockout.matches.models.events.MatchEndedEvent;

import lombok.RequiredArgsConstructor;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishMatchEndedEvent(Long matchId) {
        MatchEndedEvent event = MatchEndedEvent.builder().matchId(matchId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "match.ended",
                event);
    }
}