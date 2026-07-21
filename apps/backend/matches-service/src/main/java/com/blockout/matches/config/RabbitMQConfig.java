package com.blockout.matches.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String ENTITY_LIFECYCLE_EXCHANGE = "entity.lifecycle.exchange";

    public static final String TEAM_DEACTIVATION_QUEUE_MATCHES = "team.deactivation.queue.matches";
    public static final String POOL_DEACTIVATION_QUEUE_MATCHES = "pool.deactivation.queue.matches";
    public static final String TEAM_BY_POOL_DEACTIVATION_QUEUE_MATCHES = "teambypool.deactivation.queue.matches";

    public static final String MATCH_FINISHED_QUEUE = "match.finished.queue.notifications";
    public static final String MATCH_LIVE_LINK_CREATED_QUEUE = "match.live-link-created.queue.notifications";

    public static final String RK_MATCH_FINISHED = "match.finished";
    public static final String RK_MATCH_LIVE_LINK_CREATED = "match.live-link-created";

    @Bean
    public TopicExchange entityLifecycleExchange() {
        return new TopicExchange(ENTITY_LIFECYCLE_EXCHANGE);
    }

    @Bean
    public Queue teamDeactivationQueueMatches() {
        return new Queue(TEAM_DEACTIVATION_QUEUE_MATCHES, true);
    }

    @Bean
    public Queue poolDeactivationQueueMatches() {
        return new Queue(POOL_DEACTIVATION_QUEUE_MATCHES, true);
    }

    @Bean
    public Queue teamByPoolDeactivationQueueMatches() {
        return new Queue(TEAM_BY_POOL_DEACTIVATION_QUEUE_MATCHES, true);
    }

    @Bean
    public Queue matchFinishedQueue() {
        return new Queue(MATCH_FINISHED_QUEUE, true);
    }

    @Bean
    public Queue matchLiveLinkCreatedQueue() {
        return new Queue(MATCH_LIVE_LINK_CREATED_QUEUE, true);
    }

    @Bean
    public Binding bindTeamDeactivationQueueMatches(
        TopicExchange entityLifecycleExchange,
        Queue teamDeactivationQueueMatches) {
        return BindingBuilder.bind(teamDeactivationQueueMatches)
            .to(entityLifecycleExchange)
            .with("team.deactivation");
    }

    @Bean
    public Binding bindPoolDeactivationQueueMatches(
        TopicExchange entityLifecycleExchange,
        Queue poolDeactivationQueueMatches) {
        return BindingBuilder.bind(poolDeactivationQueueMatches)
            .to(entityLifecycleExchange)
            .with("pool.deactivation");
    }

    @Bean
    public Binding bindTeamByPoolDeactivationQueueMatches(
        TopicExchange entityLifecycleExchange,
        Queue teamByPoolDeactivationQueueMatches) {
        return BindingBuilder.bind(teamByPoolDeactivationQueueMatches)
            .to(entityLifecycleExchange)
            .with("teambypool.deactivation");
    }

    @Bean
    public Binding bindMatchFinishedQueue(
        TopicExchange entityLifecycleExchange,
        Queue matchFinishedQueue) {
        return BindingBuilder.bind(matchFinishedQueue)
            .to(entityLifecycleExchange)
            .with(RK_MATCH_FINISHED);
    }

    @Bean
    public Binding bindMatchLiveLinkCreatedQueue(
        TopicExchange entityLifecycleExchange,
        Queue matchLiveLinkCreatedQueue) {
        return BindingBuilder.bind(matchLiveLinkCreatedQueue)
            .to(entityLifecycleExchange)
            .with(RK_MATCH_LIVE_LINK_CREATED);
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
