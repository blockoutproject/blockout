package com.blockout.competitions.association.infrastructure.messaging;

import com.blockout.competitions.association.application.ports.CompetitionDeactivationPublisher;
import com.blockout.competitions.association.infrastructure.messaging.events.ClubDeactivationEvent;
import com.blockout.competitions.association.infrastructure.messaging.events.PoolDeactivationEvent;
import com.blockout.competitions.association.infrastructure.messaging.events.TeamDeactivationByPoolEvent;
import com.blockout.competitions.association.infrastructure.messaging.events.TeamDeactivationEvent;
import com.blockout.competitions.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/** RabbitMQ adapter for the existing competition cascade commands. */
@Component
@RequiredArgsConstructor
public class RabbitCompetitionDeactivationPublisher implements CompetitionDeactivationPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publishTeamDeactivation(Long teamId) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "team.deactivation",
                new TeamDeactivationEvent(teamId));
    }

    @Override
    public void publishPoolDeactivation(Long poolId) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "pool.deactivation",
                new PoolDeactivationEvent(poolId));
    }

    @Override
    public void publishTeamDeactivationByPool(Long teamId, Long poolId) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "teambypool.deactivation",
                new TeamDeactivationByPoolEvent(teamId, poolId));
    }

    @Override
    public void publishClubDeactivation(String clubId) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
                "club.deactivation",
                new ClubDeactivationEvent(clubId));
    }
}
