package com.blockout.clubs.listeners;

import com.blockout.clubs.config.RabbitMQConfig;
import com.blockout.shared.events.ClubDeactivatedEvent;
import com.blockout.clubs.services.ClubService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class ClubListeners {

    private final ClubService clubService;
    private static final Logger logger = LoggerFactory.getLogger(ClubService.class);

    public ClubListeners(ClubService clubService) {
        this.clubService = clubService;
    }

}