package com.blockout.clubs.listeners;

import com.blockout.clubs.config.RabbitMQConfig;
import com.blockout.shared.events.ClubDeactivatedEvent;
import com.blockout.clubs.services.ClubService;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class ClubListeners {

    private final ClubService clubService;

    public ClubListeners(ClubService clubService) {
        this.clubService = clubService;
    }

    @RabbitListener(queues = RabbitMQConfig.CLUB_DEACTIVATED_QUEUE_CLUBS)
    public void handleClubDeactivated(ClubDeactivatedEvent event) {
        String clubId = event.getClubId();
        clubService.deactivateClub(clubId);
    }
}