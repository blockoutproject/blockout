package com.blockout.teams.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.teams.listeners.TeamListeners;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.annotation.RabbitListener;

class LifecycleV2TopologyTest {

    private final RabbitMQConfig config = new RabbitMQConfig();

    @Test
    void declaresBothDurableV2QueuesWithoutAddingDeadLetterPolicies() {
        var exchange = config.entityLifecycleExchange();
        var teamQueue = config.teamDeactivationQueueTeamsV2();
        var clubQueue = config.clubDeactivationQueueTeamsV2();

        assertThat(teamQueue.isDurable()).isTrue();
        assertThat(clubQueue.isDurable()).isTrue();
        assertThat(teamQueue.getArguments()).isEmpty();
        assertThat(clubQueue.getArguments()).isEmpty();
        assertThat(config.bindTeamDeactivationQueueTeamsV2(exchange, teamQueue).getRoutingKey())
                .isEqualTo("team.deactivation.v2");
        assertThat(config.bindClubDeactivationQueueTeamsV2(exchange, clubQueue).getRoutingKey())
                .isEqualTo("club.deactivation.v2");
    }

    @Test
    void keepsBothListenerPairsBehindOppositeDefaults() {
        assertPair("handleTeamDeactivation", "handleTeamDeactivationV2");
        assertPair("handleClubDeactivation", "handleClubDeactivationV2");
    }

    @Test
    void rejectsConcurrentLifecycleConsumers() {
        var properties = new LifecycleEventConsumerProperties();
        properties.setLifecycleV2Enabled(true);

        assertThatThrownBy(properties::afterPropertiesSet)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("MRG-304");
    }

    private void assertPair(String v1Method, String v2Method) {
        assertThat(annotation(v1Method).autoStartup())
                .isEqualTo("${blockout.events.consumers.lifecycle-v1-enabled:true}");
        assertThat(annotation(v2Method).autoStartup())
                .isEqualTo("${blockout.events.consumers.lifecycle-v2-enabled:false}");
    }

    private RabbitListener annotation(String methodName) {
        return java.util.Arrays.stream(TeamListeners.class.getDeclaredMethods())
                .filter(method -> method.getName().equals(methodName))
                .findFirst().orElseThrow().getAnnotation(RabbitListener.class);
    }
}
