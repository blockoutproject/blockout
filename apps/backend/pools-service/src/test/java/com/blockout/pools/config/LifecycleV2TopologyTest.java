package com.blockout.pools.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.pools.listeners.PoolListeners;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.annotation.RabbitListener;

class LifecycleV2TopologyTest {

    private final RabbitMQConfig config = new RabbitMQConfig();

    @Test
    void declaresDurableV2QueueWithoutAddingADeadLetterPolicy() {
        var exchange = config.entityLifecycleExchange();
        var queue = config.poolDeactivationQueuePoolsV2();
        var binding = config.bindPoolDeactivationQueuePoolsV2(exchange, queue);

        assertThat(queue.getName()).isEqualTo(RabbitMQConfig.POOL_DEACTIVATION_QUEUE_POOLS_V2);
        assertThat(queue.isDurable()).isTrue();
        assertThat(queue.getArguments()).isEmpty();
        assertThat(binding.getRoutingKey()).isEqualTo("pool.deactivation.v2");
    }

    @Test
    void keepsV1AndV2BehindOppositeDefaults() {
        assertThat(annotation("handlePoolDeactivation").autoStartup())
                .isEqualTo("${blockout.events.consumers.lifecycle-v1-enabled:true}");
        assertThat(annotation("handlePoolDeactivationV2").autoStartup())
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
        return java.util.Arrays.stream(PoolListeners.class.getDeclaredMethods())
                .filter(method -> method.getName().equals(methodName))
                .findFirst().orElseThrow().getAnnotation(RabbitListener.class);
    }
}
