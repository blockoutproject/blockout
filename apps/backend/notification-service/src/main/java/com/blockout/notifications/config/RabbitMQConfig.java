package com.blockout.notifications.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String USER_FOLLOW_EXCHANGE = "user.follow.exchange";
    public static final String USER_FOLLOW_DLQ_EXCHANGE = "user.follow.dlq.exchange";

    public static final String TEAM_FOLLOW_QUEUE_NOTIFICATIONS = "team.follow.queue.notifications";
    public static final String POOL_FOLLOW_QUEUE_NOTIFICATIONS = "pool.follow.queue.notifications";
    public static final String TEAM_FOLLOW_QUEUE_NOTIFICATIONS_V2 = "team.follow.queue.notifications.v2";
    public static final String POOL_FOLLOW_QUEUE_NOTIFICATIONS_V2 = "pool.follow.queue.notifications.v2";

    public static final String TEAM_FOLLOW_DLQ_NOTIFICATIONS = "team.follow.queue.notifications.dlq";
    public static final String POOL_FOLLOW_DLQ_NOTIFICATIONS = "pool.follow.queue.notifications.dlq";
    public static final String TEAM_FOLLOW_DLQ_NOTIFICATIONS_V2 = "team.follow.queue.notifications.dlq.v2";
    public static final String POOL_FOLLOW_DLQ_NOTIFICATIONS_V2 = "pool.follow.queue.notifications.dlq.v2";

    public static final String RK_TEAM_FOLLOW = "team.follow";
    public static final String RK_POOL_FOLLOW = "pool.follow";
    public static final String RK_TEAM_FOLLOW_V2 = "team.follow.v2";
    public static final String RK_POOL_FOLLOW_V2 = "pool.follow.v2";

    public static final String RK_TEAM_FOLLOW_DLQ = "team.follow.dlq";
    public static final String RK_POOL_FOLLOW_DLQ = "pool.follow.dlq";
    public static final String RK_TEAM_FOLLOW_DLQ_V2 = "team.follow.dlq.v2";
    public static final String RK_POOL_FOLLOW_DLQ_V2 = "pool.follow.dlq.v2";

    public static final String ENTITY_LIFECYCLE_EXCHANGE = "entity.lifecycle.exchange";
    public static final String ENTITY_LIFECYCLE_DLQ_EXCHANGE = "entity.lifecycle.dlq.exchange";

    public static final String MATCH_FINISHED_QUEUE = "match.finished.queue.notifications";
    public static final String MATCH_FINISHED_DLQ = "match.finished.queue.notifications.dlq";
    public static final String MATCH_FINISHED_QUEUE_V2 = "match.finished.queue.notifications.v2";
    public static final String MATCH_FINISHED_DLQ_V2 = "match.finished.queue.notifications.dlq.v2";

    public static final String RK_MATCH_FINISHED = "match.finished";
    public static final String RK_MATCH_FINISHED_DLQ = "match.finished.dlq";
    public static final String RK_MATCH_FINISHED_V2 = "match.finished.v2";
    public static final String RK_MATCH_FINISHED_DLQ_V2 = "match.finished.dlq.v2";

    public static final String MATCH_LIVE_LINK_CREATED_QUEUE = "match.live-link-created.queue.notifications";
    public static final String MATCH_LIVE_LINK_CREATED_DLQ = "match.live-link-created.queue.notifications.dlq";
    public static final String MATCH_LIVE_LINK_CREATED_QUEUE_V2 = "match.live-link-created.queue.notifications.v2";
    public static final String MATCH_LIVE_LINK_CREATED_DLQ_V2 = "match.live-link-created.queue.notifications.dlq.v2";

    public static final String RK_MATCH_LIVE_LINK_CREATED = "match.live-link-created";
    public static final String RK_MATCH_LIVE_LINK_CREATED_DLQ = "match.live-link-created.dlq";
    public static final String RK_MATCH_LIVE_LINK_CREATED_V2 = "match.live-link-created.v2";
    public static final String RK_MATCH_LIVE_LINK_CREATED_DLQ_V2 = "match.live-link-created.dlq.v2";

    @Bean
    public TopicExchange userFollowExchange() {
        return new TopicExchange(USER_FOLLOW_EXCHANGE);
    }

    @Bean
    public TopicExchange userFollowDlqExchange() {
        return new TopicExchange(USER_FOLLOW_DLQ_EXCHANGE);
    }

    @Bean
    public TopicExchange entityLifecycleExchange() {
        return new TopicExchange(ENTITY_LIFECYCLE_EXCHANGE);
    }

    @Bean
    public TopicExchange entityLifecycleDlqExchange() {
        return new TopicExchange(ENTITY_LIFECYCLE_DLQ_EXCHANGE);
    }

    @Bean
    public Queue userFollowQueueTeams() {
        return QueueBuilder.durable(TEAM_FOLLOW_QUEUE_NOTIFICATIONS)
                .withArgument("x-dead-letter-exchange", USER_FOLLOW_DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", RK_TEAM_FOLLOW_DLQ)
                .build();
    }

    @Bean
    public Queue userFollowQueuePools() {
        return QueueBuilder.durable(POOL_FOLLOW_QUEUE_NOTIFICATIONS)
                .withArgument("x-dead-letter-exchange", USER_FOLLOW_DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", RK_POOL_FOLLOW_DLQ)
                .build();
    }

    @Bean
    public Queue userFollowQueueTeamsV2() {
        return QueueBuilder.durable(TEAM_FOLLOW_QUEUE_NOTIFICATIONS_V2)
                .withArgument("x-dead-letter-exchange", USER_FOLLOW_DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", RK_TEAM_FOLLOW_DLQ_V2)
                .build();
    }

    @Bean
    public Queue userFollowQueuePoolsV2() {
        return QueueBuilder.durable(POOL_FOLLOW_QUEUE_NOTIFICATIONS_V2)
                .withArgument("x-dead-letter-exchange", USER_FOLLOW_DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", RK_POOL_FOLLOW_DLQ_V2)
                .build();
    }

    @Bean
    public Queue teamFollowDlq() {
        return QueueBuilder.durable(TEAM_FOLLOW_DLQ_NOTIFICATIONS).build();
    }

    @Bean
    public Queue poolFollowDlq() {
        return QueueBuilder.durable(POOL_FOLLOW_DLQ_NOTIFICATIONS).build();
    }

    @Bean
    public Queue teamFollowDlqV2() {
        return QueueBuilder.durable(TEAM_FOLLOW_DLQ_NOTIFICATIONS_V2).build();
    }

    @Bean
    public Queue poolFollowDlqV2() {
        return QueueBuilder.durable(POOL_FOLLOW_DLQ_NOTIFICATIONS_V2).build();
    }

    @Bean
    public Queue matchFinishedQueue() {
        return QueueBuilder.durable(MATCH_FINISHED_QUEUE)
                .withArgument("x-dead-letter-exchange", ENTITY_LIFECYCLE_DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", RK_MATCH_FINISHED_DLQ)
                .build();
    }

    @Bean
    public Queue matchFinishedDlq() {
        return QueueBuilder.durable(MATCH_FINISHED_DLQ).build();
    }

    @Bean
    public Queue matchFinishedQueueV2() {
        return QueueBuilder.durable(MATCH_FINISHED_QUEUE_V2)
                .withArgument("x-dead-letter-exchange", ENTITY_LIFECYCLE_DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", RK_MATCH_FINISHED_DLQ_V2)
                .build();
    }

    @Bean
    public Queue matchFinishedDlqV2() {
        return QueueBuilder.durable(MATCH_FINISHED_DLQ_V2).build();
    }

    @Bean
    public Queue matchLiveLinkCreatedQueue() {
        return QueueBuilder.durable(MATCH_LIVE_LINK_CREATED_QUEUE)
                .withArgument("x-dead-letter-exchange", ENTITY_LIFECYCLE_DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", RK_MATCH_LIVE_LINK_CREATED_DLQ)
                .build();
    }

    @Bean
    public Queue matchLiveLinkCreatedDlq() {
        return QueueBuilder.durable(MATCH_LIVE_LINK_CREATED_DLQ).build();
    }

    @Bean
    public Queue matchLiveLinkCreatedQueueV2() {
        return QueueBuilder.durable(MATCH_LIVE_LINK_CREATED_QUEUE_V2)
                .withArgument("x-dead-letter-exchange", ENTITY_LIFECYCLE_DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", RK_MATCH_LIVE_LINK_CREATED_DLQ_V2)
                .build();
    }

    @Bean
    public Queue matchLiveLinkCreatedDlqV2() {
        return QueueBuilder.durable(MATCH_LIVE_LINK_CREATED_DLQ_V2).build();
    }

    @Bean
    public Binding bindUserFollowQueueTeams(Queue userFollowQueueTeams, TopicExchange userFollowExchange) {
        return BindingBuilder.bind(userFollowQueueTeams)
                .to(userFollowExchange)
                .with(RK_TEAM_FOLLOW);
    }

    @Bean
    public Binding bindUserFollowQueuePools(Queue userFollowQueuePools, TopicExchange userFollowExchange) {
        return BindingBuilder.bind(userFollowQueuePools)
                .to(userFollowExchange)
                .with(RK_POOL_FOLLOW);
    }

    @Bean
    public Binding bindUserFollowQueueTeamsV2(Queue userFollowQueueTeamsV2, TopicExchange userFollowExchange) {
        return BindingBuilder.bind(userFollowQueueTeamsV2)
                .to(userFollowExchange)
                .with(RK_TEAM_FOLLOW_V2);
    }

    @Bean
    public Binding bindUserFollowQueuePoolsV2(Queue userFollowQueuePoolsV2, TopicExchange userFollowExchange) {
        return BindingBuilder.bind(userFollowQueuePoolsV2)
                .to(userFollowExchange)
                .with(RK_POOL_FOLLOW_V2);
    }

    @Bean
    public Binding bindTeamFollowDlq(Queue teamFollowDlq, TopicExchange userFollowDlqExchange) {
        return BindingBuilder.bind(teamFollowDlq)
                .to(userFollowDlqExchange)
                .with(RK_TEAM_FOLLOW_DLQ);
    }

    @Bean
    public Binding bindPoolFollowDlq(Queue poolFollowDlq, TopicExchange userFollowDlqExchange) {
        return BindingBuilder.bind(poolFollowDlq)
                .to(userFollowDlqExchange)
                .with(RK_POOL_FOLLOW_DLQ);
    }

    @Bean
    public Binding bindTeamFollowDlqV2(Queue teamFollowDlqV2, TopicExchange userFollowDlqExchange) {
        return BindingBuilder.bind(teamFollowDlqV2)
                .to(userFollowDlqExchange)
                .with(RK_TEAM_FOLLOW_DLQ_V2);
    }

    @Bean
    public Binding bindPoolFollowDlqV2(Queue poolFollowDlqV2, TopicExchange userFollowDlqExchange) {
        return BindingBuilder.bind(poolFollowDlqV2)
                .to(userFollowDlqExchange)
                .with(RK_POOL_FOLLOW_DLQ_V2);
    }

    @Bean
    public Binding bindMatchFinishedQueue(Queue matchFinishedQueue, TopicExchange entityLifecycleExchange) {
        return BindingBuilder.bind(matchFinishedQueue)
                .to(entityLifecycleExchange)
                .with(RK_MATCH_FINISHED);
    }

    @Bean
    public Binding bindMatchFinishedDlq(Queue matchFinishedDlq, TopicExchange entityLifecycleDlqExchange) {
        return BindingBuilder.bind(matchFinishedDlq)
                .to(entityLifecycleDlqExchange)
                .with(RK_MATCH_FINISHED_DLQ);
    }

    @Bean
    public Binding bindMatchFinishedQueueV2(Queue matchFinishedQueueV2, TopicExchange entityLifecycleExchange) {
        return BindingBuilder.bind(matchFinishedQueueV2)
                .to(entityLifecycleExchange)
                .with(RK_MATCH_FINISHED_V2);
    }

    @Bean
    public Binding bindMatchFinishedDlqV2(Queue matchFinishedDlqV2, TopicExchange entityLifecycleDlqExchange) {
        return BindingBuilder.bind(matchFinishedDlqV2)
                .to(entityLifecycleDlqExchange)
                .with(RK_MATCH_FINISHED_DLQ_V2);
    }

    @Bean
    public Binding bindMatchLiveLinkCreatedQueue(Queue matchLiveLinkCreatedQueue,
            TopicExchange entityLifecycleExchange) {
        return BindingBuilder.bind(matchLiveLinkCreatedQueue)
                .to(entityLifecycleExchange)
                .with(RK_MATCH_LIVE_LINK_CREATED);
    }

    @Bean
    public Binding bindMatchLiveLinkCreatedDlq(Queue matchLiveLinkCreatedDlq,
            TopicExchange entityLifecycleDlqExchange) {
        return BindingBuilder.bind(matchLiveLinkCreatedDlq)
                .to(entityLifecycleDlqExchange)
                .with(RK_MATCH_LIVE_LINK_CREATED_DLQ);
    }

    @Bean
    public Binding bindMatchLiveLinkCreatedQueueV2(Queue matchLiveLinkCreatedQueueV2,
            TopicExchange entityLifecycleExchange) {
        return BindingBuilder.bind(matchLiveLinkCreatedQueueV2)
                .to(entityLifecycleExchange)
                .with(RK_MATCH_LIVE_LINK_CREATED_V2);
    }

    @Bean
    public Binding bindMatchLiveLinkCreatedDlqV2(Queue matchLiveLinkCreatedDlqV2,
            TopicExchange entityLifecycleDlqExchange) {
        return BindingBuilder.bind(matchLiveLinkCreatedDlqV2)
                .to(entityLifecycleDlqExchange)
                .with(RK_MATCH_LIVE_LINK_CREATED_DLQ_V2);
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate tpl = new RabbitTemplate(connectionFactory);
        tpl.setMessageConverter(messageConverter());
        return tpl;
    }
}
