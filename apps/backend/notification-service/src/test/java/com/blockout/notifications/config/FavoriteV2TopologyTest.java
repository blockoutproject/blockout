package com.blockout.notifications.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.listeners.PoolFollowListener;
import com.blockout.notifications.listeners.TeamFollowListener;
import com.blockout.notifications.models.events.UserFollowEvent;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.junit.jupiter.api.Test;

class FavoriteV2TopologyTest {

    private final RabbitMQConfig config = new RabbitMQConfig();

    @Test
    void declaresOnlyTheApprovedNotificationV2QueuesAndDlqs() {
        var team = config.userFollowQueueTeamsV2();
        var pool = config.userFollowQueuePoolsV2();

        assertThat(team.getName()).isEqualTo("team.follow.queue.notifications.v2");
        assertThat(team.getArguments())
                .containsEntry("x-dead-letter-exchange", "user.follow.dlq.exchange")
                .containsEntry("x-dead-letter-routing-key", "team.follow.dlq.v2");
        assertThat(pool.getName()).isEqualTo("pool.follow.queue.notifications.v2");
        assertThat(pool.getArguments())
                .containsEntry("x-dead-letter-exchange", "user.follow.dlq.exchange")
                .containsEntry("x-dead-letter-routing-key", "pool.follow.dlq.v2");
        assertThat(config.teamFollowDlqV2().getName()).isEqualTo("team.follow.queue.notifications.dlq.v2");
        assertThat(config.poolFollowDlqV2().getName()).isEqualTo("pool.follow.queue.notifications.dlq.v2");
    }

    @Test
    void bindsTheApprovedV2RoutesWithoutCreatingTeamOrPoolServiceQueues() {
        var exchange = config.userFollowExchange();
        var teamBinding = config.bindUserFollowQueueTeamsV2(config.userFollowQueueTeamsV2(), exchange);
        var poolBinding = config.bindUserFollowQueuePoolsV2(config.userFollowQueuePoolsV2(), exchange);

        assertThat(teamBinding.getRoutingKey()).isEqualTo("team.follow.v2");
        assertThat(poolBinding.getRoutingKey()).isEqualTo("pool.follow.v2");
        assertThat(RabbitMQConfig.class.getDeclaredFields())
                .noneMatch(field -> field.getName().contains("QUEUE_TEAMS_V2")
                        || field.getName().contains("QUEUE_POOLS_V2"));
    }

    @Test
    void keepsSideEffectListenersOnTheLegacyQueuesUntilThePausedCutover() throws NoSuchMethodException {
        RabbitListener team = TeamFollowListener.class
                .getDeclaredMethod("onTeamFollowChanged", UserFollowEvent.class)
                .getAnnotation(RabbitListener.class);
        RabbitListener pool = PoolFollowListener.class
                .getDeclaredMethod("onPoolFollowChanged", UserFollowEvent.class)
                .getAnnotation(RabbitListener.class);

        assertThat(team.queues()).containsExactly("team.follow.queue.notifications");
        assertThat(pool.queues()).containsExactly("pool.follow.queue.notifications");
    }
}
