package com.blockout.competitions.association.infrastructure.messaging;

import com.blockout.competitions.association.infrastructure.messaging.events.ClubDeactivationEvent;
import com.blockout.competitions.association.infrastructure.messaging.events.PoolDeactivationEvent;
import com.blockout.competitions.association.infrastructure.messaging.events.TeamDeactivationByPoolEvent;
import com.blockout.competitions.association.infrastructure.messaging.events.TeamDeactivationEvent;
import com.blockout.competitions.config.RabbitMQConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("Competition deactivation publisher")
class RabbitCompetitionDeactivationPublisherUnitTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Test
    @DisplayName("keeps the established exchange, routing keys, and payloads")
    void keepsEstablishedRabbitContract() {
        RabbitCompetitionDeactivationPublisher publisher = new RabbitCompetitionDeactivationPublisher(rabbitTemplate);

        publisher.publishTeamDeactivation(1L);
        publisher.publishPoolDeactivation(2L);
        publisher.publishTeamDeactivationByPool(3L, 4L);
        publisher.publishClubDeactivation("club-1");

        verify(rabbitTemplate).convertAndSend(
            RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, "team.deactivation", new TeamDeactivationEvent(1L));
        verify(rabbitTemplate).convertAndSend(
            RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, "pool.deactivation", new PoolDeactivationEvent(2L));
        verify(rabbitTemplate).convertAndSend(
            RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE,
            "teambypool.deactivation",
            new TeamDeactivationByPoolEvent(3L, 4L));
        verify(rabbitTemplate).convertAndSend(
            RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE, "club.deactivation", new ClubDeactivationEvent("club-1"));
    }
}
