package com.blockout.notifications.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.listeners.MatchFinishedListener;
import com.blockout.notifications.listeners.MatchLiveLinkCreatedListener;
import com.blockout.notifications.models.events.MatchFinishedEvent;
import com.blockout.notifications.models.events.MatchLiveLinkCreatedEvent;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.annotation.RabbitListener;

class MatchV2TopologyTest {

    private final RabbitMQConfig config = new RabbitMQConfig();

    @Test
    void declaresNotificationOwnedV2QueuesDlqsAndBindings() {
        var finished = config.matchFinishedQueueV2();
        var live = config.matchLiveLinkCreatedQueueV2();

        assertThat(finished.getName()).isEqualTo("match.finished.queue.notifications.v2");
        assertThat(finished.getArguments())
                .containsEntry("x-dead-letter-exchange", "entity.lifecycle.dlq.exchange")
                .containsEntry("x-dead-letter-routing-key", "match.finished.dlq.v2");
        assertThat(live.getName()).isEqualTo("match.live-link-created.queue.notifications.v2");
        assertThat(live.getArguments())
                .containsEntry("x-dead-letter-exchange", "entity.lifecycle.dlq.exchange")
                .containsEntry("x-dead-letter-routing-key", "match.live-link-created.dlq.v2");
        assertThat(config.matchFinishedDlqV2().getName()).isEqualTo("match.finished.queue.notifications.dlq.v2");
        assertThat(config.matchLiveLinkCreatedDlqV2().getName())
                .isEqualTo("match.live-link-created.queue.notifications.dlq.v2");
        assertThat(config.bindMatchFinishedQueueV2(finished, config.entityLifecycleExchange()).getRoutingKey())
                .isEqualTo("match.finished.v2");
        assertThat(config.bindMatchLiveLinkCreatedQueueV2(live, config.entityLifecycleExchange()).getRoutingKey())
                .isEqualTo("match.live-link-created.v2");
    }

    @Test
    void keepsDefaultAcknowledgementSideEffectsOnLegacyQueuesUntilMrg372() throws NoSuchMethodException {
        RabbitListener finished = MatchFinishedListener.class
                .getDeclaredMethod("onMatchFinished", MatchFinishedEvent.class)
                .getAnnotation(RabbitListener.class);
        RabbitListener live = MatchLiveLinkCreatedListener.class
                .getDeclaredMethod("onMatchLiveLinkCreated", MatchLiveLinkCreatedEvent.class)
                .getAnnotation(RabbitListener.class);

        assertThat(finished.queues()).containsExactly("match.finished.queue.notifications");
        assertThat(live.queues()).containsExactly("match.live-link-created.queue.notifications");
        assertThat(finished.containerFactory()).isEmpty();
        assertThat(live.containerFactory()).isEmpty();
    }
}
