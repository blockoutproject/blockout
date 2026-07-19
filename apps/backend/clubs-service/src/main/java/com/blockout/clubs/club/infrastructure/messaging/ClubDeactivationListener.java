package com.blockout.clubs.club.infrastructure.messaging;

import com.blockout.clubs.club.application.ClubService;
import com.blockout.clubs.club.infrastructure.messaging.events.ClubDeactivationEvent;
import com.blockout.clubs.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Applies the existing competition cascade command to the owning Club service.
 */
@Component
@RequiredArgsConstructor
public class ClubDeactivationListener {

    private final ClubService clubService;

    /**
     * Soft-deletes the Club targeted by an existing deactivation message.
     */
    @RabbitListener(queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_CLUBS)
    public void handleClubDeactivation(ClubDeactivationEvent event) {
        clubService.deactivateClub(event.getClubId());
    }
}
