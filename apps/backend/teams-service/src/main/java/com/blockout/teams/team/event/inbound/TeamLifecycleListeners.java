package com.blockout.teams.team.event.inbound;

import com.blockout.outbox.ConsumedEventProcessor;
import com.blockout.teams.config.RabbitMQConfig;
import com.blockout.teams.models.events.ClubDeactivationEvent;
import com.blockout.teams.models.events.TeamDeactivationEvent;
import com.blockout.teams.team.application.TeamLifecycleService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TeamLifecycleListeners {

    private final TeamLifecycleService lifecycleService;
    private final TeamLifecycleV2MessageDecoder v2Decoder;
    private final ConsumedEventProcessor consumedEvents;

    @RabbitListener(
            queues = RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_TEAMS,
            autoStartup = "${blockout.events.consumers.lifecycle-v1-enabled:true}")
    public void handleTeamDeactivation(
            TeamDeactivationEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventId) {
        consumedEvents.processLegacy(
                eventId, "TEAM_DEACTIVATED", () -> lifecycleService.deactivate(event.getTeamId()));
    }

    @RabbitListener(
            queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_TEAMS,
            autoStartup = "${blockout.events.consumers.lifecycle-v1-enabled:true}")
    public void handleClubDeactivation(
            ClubDeactivationEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventId) {
        consumedEvents.processLegacy(
                eventId, "CLUB_DEACTIVATED", () -> lifecycleService.deactivateByClubId(event.getClubId()));
    }

    @RabbitListener(
            queues = RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_TEAMS_V2,
            autoStartup = "${blockout.events.consumers.lifecycle-v2-enabled:false}")
    public void handleTeamDeactivationV2(Message message) {
        TeamDeactivationFact event = v2Decoder.decodeTeam(message);
        consumedEvents.processV2(
                event.eventId(), event.eventType(), () -> lifecycleService.deactivate(event.teamId()));
    }

    @RabbitListener(
            queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_TEAMS_V2,
            autoStartup = "${blockout.events.consumers.lifecycle-v2-enabled:false}")
    public void handleClubDeactivationV2(Message message) {
        ClubDeactivationFact event = v2Decoder.decodeClub(message);
        consumedEvents.processV2(
                event.eventId(), event.eventType(), () -> lifecycleService.deactivateByClubId(event.clubId()));
    }
}
