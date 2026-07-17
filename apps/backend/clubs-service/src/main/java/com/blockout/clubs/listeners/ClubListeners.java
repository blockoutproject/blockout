package com.blockout.clubs.listeners;

import com.blockout.clubs.config.RabbitMQConfig;
import com.blockout.clubs.club.application.ClubService;
import com.blockout.clubs.models.events.ClubDeactivationEvent;

import lombok.RequiredArgsConstructor;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ClubListeners {

    private final ClubService clubService;

    @RabbitListener(queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_CLUBS)
    public void handleClubDeactivation(ClubDeactivationEvent event) {
        String clubId = event.getClubId();
        clubService.deactivate(clubId);
    }
}
