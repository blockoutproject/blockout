package com.blockout.matches.match.infrastructure.messaging;

import com.blockout.matches.config.RabbitMQConfig;
import com.blockout.matches.match.application.models.MatchStatus;
import com.blockout.matches.match.application.views.MatchView;
import com.blockout.matches.match.infrastructure.messaging.events.MatchFinishedEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class RabbitMatchEventPublisherUnitTest {

    @Mock RabbitTemplate rabbitTemplate;

    @Test
    void preservesTheMatchFinishedRoutingAndPayload() {
        RabbitMatchEventPublisher publisher = new RabbitMatchEventPublisher(rabbitTemplate);
        Instant now = Instant.parse("2026-07-19T12:00:00Z");
        MatchView match = new MatchView(
                1L, "M1", "L1", 2L, null, 3L, 4L, now, "2026", "3-0", "75-60",
                MatchStatus.FINISHED, null, null, null, true, now, now, null, null, null);
        ArgumentCaptor<Object> event = ArgumentCaptor.forClass(Object.class);

        publisher.publishMatchFinished(match);

        verify(rabbitTemplate).convertAndSend(
                org.mockito.ArgumentMatchers.eq(RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE),
                org.mockito.ArgumentMatchers.eq(RabbitMQConfig.RK_MATCH_FINISHED), event.capture());
        assertThat(event.getValue()).isEqualTo(new MatchFinishedEvent(1L, 3L, 4L, 2L, "3-0"));
    }
}
