package com.blockout.clubs.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.clubs.listeners.ClubListeners;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.annotation.RabbitListener;

class LifecycleV2TopologyTest {

    private final RabbitMQConfig config = new RabbitMQConfig();

    @Test
    void declaresDurableV2QueueWithoutAddingADeadLetterPolicy() {
        var exchange = config.entityLifecycleExchange();
        var queue = config.clubDeactivationQueueClubsV2();
        var binding = config.bindClubDeactivationQueueClubsV2(exchange, queue);

        assertThat(queue.getName()).isEqualTo(RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_CLUBS_V2);
        assertThat(queue.isDurable()).isTrue();
        assertThat(queue.getArguments()).isEmpty();
        assertThat(binding.getRoutingKey()).isEqualTo("club.deactivation.v2");
    }

    @Test
    void keepsV1AndV2BehindOppositeDefaults() {
        assertThat(annotation("handleClubDeactivation").autoStartup())
                .isEqualTo("${blockout.events.consumers.lifecycle-v1-enabled:true}");
        assertThat(annotation("handleClubDeactivationV2").autoStartup())
                .isEqualTo("${blockout.events.consumers.lifecycle-v2-enabled:false}");
    }

    @Test
    void rejectsConcurrentLifecycleConsumers() {
        var properties = new LifecycleEventConsumerProperties();
        properties.setLifecycleV2Enabled(true);

        assertThatThrownBy(properties::afterPropertiesSet)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("MRG-304");
    }

    private RabbitListener annotation(String methodName) {
        return java.util.Arrays.stream(ClubListeners.class.getDeclaredMethods())
                .filter(method -> method.getName().equals(methodName))
                .findFirst().orElseThrow().getAnnotation(RabbitListener.class);
    }
}
