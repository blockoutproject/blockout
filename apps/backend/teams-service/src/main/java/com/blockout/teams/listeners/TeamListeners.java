package com.blockout.teams.listeners;

import com.blockout.teams.config.RabbitMQConfig;
import com.blockout.teams.models.events.ClubDeactivationEvent;
import com.blockout.teams.models.events.TeamDeactivationEvent;
import com.blockout.teams.team.application.TeamService;
import com.blockout.outbox.ConsumedEventProcessor;

import lombok.RequiredArgsConstructor;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.core.Message;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TeamListeners {

    private final TeamService teamService;
    private final TeamLifecycleV2MessageDecoder v2Decoder;
    private final ConsumedEventProcessor consumedEvents;

    @RabbitListener(
            queues = RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_TEAMS,
            autoStartup = "${blockout.events.consumers.lifecycle-v1-enabled:true}")
    public void handleTeamDeactivation(
            TeamDeactivationEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventId) {
        Long teamId = event.getTeamId();
        consumedEvents.processLegacy(eventId, "TEAM_DEACTIVATED", () -> teamService.deactivate(teamId));
    }

    @RabbitListener(
            queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_TEAMS,
            autoStartup = "${blockout.events.consumers.lifecycle-v1-enabled:true}")
    public void handleClubDeactivation(
            ClubDeactivationEvent event,
            @Header(name = "x-blockout-event-id", required = false) String eventId) {
        String clubId = event.getClubId();
        consumedEvents.processLegacy(eventId, "CLUB_DEACTIVATED", () -> teamService.deactivateByClubId(clubId));
    }

    @RabbitListener(
            queues = RabbitMQConfig.TEAM_DEACTIVATION_QUEUE_TEAMS_V2,
            autoStartup = "${blockout.events.consumers.lifecycle-v2-enabled:false}")
    public void handleTeamDeactivationV2(Message message) {
        var event = v2Decoder.decodeTeam(message);
        consumedEvents.processV2(event.eventId(), event.eventType().name(),
                () -> teamService.deactivate(event.payload().teamId()));
    }

    @RabbitListener(
            queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_TEAMS_V2,
            autoStartup = "${blockout.events.consumers.lifecycle-v2-enabled:false}")
    public void handleClubDeactivationV2(Message message) {
        var event = v2Decoder.decodeClub(message);
        consumedEvents.processV2(event.eventId(), event.eventType().name(),
                () -> teamService.deactivateByClubId(event.payload().clubId()));
    }
}
