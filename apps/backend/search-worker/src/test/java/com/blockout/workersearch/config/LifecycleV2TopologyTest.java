package com.blockout.workersearch.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.workersearch.listeners.club.ClubDeactivationListener;
import com.blockout.workersearch.listeners.club.ClubUpsertListener;
import com.blockout.workersearch.listeners.pool.PoolDeactivationListener;
import com.blockout.workersearch.listeners.pool.PoolUpsertListener;
import com.blockout.workersearch.listeners.team.TeamDeactivationListener;
import com.blockout.workersearch.listeners.team.TeamUpsertListener;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;

class LifecycleV2TopologyTest {

    private final RabbitMQConfig config = new RabbitMQConfig();

    @Test
    void declaresSixV2QueuesWithMatchingDlqAndRoutes() {
        assertRoute(config.clubUpsertQueueV2(), config.bindClubUpsertQueueV2(), "club.upsert.v2");
        assertRoute(config.clubDeactivationQueueV2(), config.bindClubDeactivationQueueV2(), "club.deactivation.v2");
        assertRoute(config.teamUpsertQueueV2(), config.bindTeamUpsertQueueV2(), "team.upsert.v2");
        assertRoute(config.teamDeactivationQueueV2(), config.bindTeamDeactivationQueueV2(), "team.deactivation.v2");
        assertRoute(config.poolUpsertQueueV2(), config.bindPoolUpsertQueueV2(), "pool.upsert.v2");
        assertRoute(config.poolDeactivationQueueV2(), config.bindPoolDeactivationQueueV2(), "pool.deactivation.v2");

        assertThat(List.of(
                config.clubUpsertDlqV2().getName(), config.clubDeactivationDlqV2().getName(),
                config.teamUpsertDlqV2().getName(), config.teamDeactivationDlqV2().getName(),
                config.poolUpsertDlqV2().getName(), config.poolDeactivationDlqV2().getName()))
                .containsExactly(
                        RabbitMQConfig.CLUB_UPSERT_DLQ_SEARCH_V2,
                        RabbitMQConfig.CLUB_DEACTIVATION_DLQ_SEARCH_V2,
                        RabbitMQConfig.TEAM_UPSERT_DLQ_SEARCH_V2,
                        RabbitMQConfig.TEAM_DEACTIVATION_DLQ_SEARCH_V2,
                        RabbitMQConfig.POOL_UPSERT_DLQ_SEARCH_V2,
                        RabbitMQConfig.POOL_DEACTIVATION_DLQ_SEARCH_V2);
    }

    @Test
    void keepsEveryV1V2ListenerPairBehindOppositeDefaults() {
        assertPair(ClubUpsertListener.class, "onUpsertBatch", "onUpsertBatchV2");
        assertPair(TeamUpsertListener.class, "onUpsertBatch", "onUpsertBatchV2");
        assertPair(PoolUpsertListener.class, "onUpsertBatch", "onUpsertBatchV2");
        assertPair(ClubDeactivationListener.class, "onClubDeactivated", "onClubDeactivatedV2");
        assertPair(TeamDeactivationListener.class, "onTeamDeactivated", "onTeamDeactivatedV2");
        assertPair(PoolDeactivationListener.class, "onPoolDeactivated", "onPoolDeactivatedV2");
    }

    private void assertRoute(Queue queue, Binding binding, String routingKey) {
        assertThat(queue.isDurable()).isTrue();
        assertThat(queue.getArguments()).containsEntry("x-dead-letter-exchange",
                RabbitMQConfig.ENTITY_LIFECYCLE_DLQ_EXCHANGE);
        assertThat(queue.getArguments()).containsEntry("x-dead-letter-routing-key", routingKey.replace(".v2", ".dlq.v2"));
        assertThat(binding.getRoutingKey()).isEqualTo(routingKey);
        assertThat(binding.getExchange()).isEqualTo(RabbitMQConfig.ENTITY_LIFECYCLE_EXCHANGE);
    }

    private void assertPair(Class<?> listenerType, String v1Method, String v2Method) {
        RabbitListener v1 = annotation(listenerType, v1Method);
        RabbitListener v2 = annotation(listenerType, v2Method);
        assertThat(v1.autoStartup()).isEqualTo("${blockout.events.consumers.lifecycle-v1-enabled:true}");
        assertThat(v2.autoStartup()).isEqualTo("${blockout.events.consumers.lifecycle-v2-enabled:false}");
        if (v1Method.equals("onUpsertBatch")) {
            assertThat(v1.containerFactory()).isEqualTo("rabbitBatchFactory");
            assertThat(v2.containerFactory()).isEqualTo("rabbitV2BatchFactory");
        }
    }

    private RabbitListener annotation(Class<?> listenerType, String methodName) {
        return java.util.Arrays.stream(listenerType.getDeclaredMethods())
                .filter(method -> method.getName().equals(methodName))
                .findFirst()
                .orElseThrow()
                .getAnnotation(RabbitListener.class);
    }
}
