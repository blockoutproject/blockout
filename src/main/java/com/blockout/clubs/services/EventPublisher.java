package com.blockout.clubs.services;

import com.blockout.shared.events.ClubDeactivatedEvent;
import com.blockout.clubs.config.RabbitMQConfig;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public EventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishClubDeactivationEvent(Long clubId) {
        ClubDeactivatedEvent event = ClubDeactivatedEvent.builder().clubId(clubId).build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.DEACTIVATED_EXCHANGE,
                "club.deactivated",
                event);
    }
}