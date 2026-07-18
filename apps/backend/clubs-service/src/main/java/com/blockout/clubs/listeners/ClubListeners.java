package com.blockout.clubs.listeners;

import com.blockout.clubs.config.RabbitMQConfig;
import com.blockout.clubs.club.application.ClubService;
import com.blockout.clubs.models.events.ClubDeactivationEvent;
import com.blockout.outbox.ConsumedEventProcessor;

import lombok.RequiredArgsConstructor;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.core.Message;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ClubListeners {

    private final ClubService clubService;
    private final ClubLifecycleV2MessageDecoder v2Decoder;
    private final ConsumedEventProcessor consumedEvents;

    @RabbitListener(
            queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_CLUBS,
            autoStartup = "${blockout.events.consumers.lifecycle-v1-enabled:true}")
    public void handleClubDeactivation(
            ClubDeactivationEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventId) {
        String clubId = event.getClubId();
        consumedEvents.processLegacy(eventId, "CLUB_DEACTIVATED", () -> clubService.deactivate(clubId));
    }

    @RabbitListener(
            queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_CLUBS_V2,
            autoStartup = "${blockout.events.consumers.lifecycle-v2-enabled:false}")
    public void handleClubDeactivationV2(Message message) {
        var event = v2Decoder.decode(message);
        consumedEvents.processV2(event.eventId(), event.eventType().name(),
                () -> clubService.deactivate(event.payload().clubId()));
    }
}
