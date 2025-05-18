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
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}