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

    public static final String DEACTIVATED_EXCHANGE = "deactivated.exchange";

    public static final String TEAM_DEACTIVATED_QUEUE_MATCHES = "team.deactivated.queue.matches";
    public static final String POOL_DEACTIVATED_QUEUE_MATCHES = "pool.deactivated.queue.matches";
    public static final String TEAM_DEACTIVATED_BY_POOL_QUEUE_MATCHES = "teambypool.deactivated.queue.matches";

    @Bean
    public TopicExchange deactivatedExchange() {
        return new TopicExchange(DEACTIVATED_EXCHANGE);
    }

    @Bean
    public Queue teamDeactivatedQueueMatches() {
        return new Queue(TEAM_DEACTIVATED_QUEUE_MATCHES, true);
    }

    @Bean
    public Queue poolDeactivatedQueueMatches() {
        return new Queue(POOL_DEACTIVATED_QUEUE_MATCHES, true);
    }

    @Bean
    public Queue teamDeactivatedByPoolQueueMatches() {
        return new Queue(TEAM_DEACTIVATED_BY_POOL_QUEUE_MATCHES, true);
    }

    @Bean
    public Binding bindTeamDeactivatedQueueMatches(
            TopicExchange deactivatedExchange,
            Queue teamDeactivatedQueueMatches) {
        return BindingBuilder.bind(teamDeactivatedQueueMatches)
                .to(deactivatedExchange)
                .with("team.deactivated");
    }

    @Bean
    public Binding bindPoolDeactivatedQueueMatches(
            TopicExchange deactivatedExchange,
            Queue poolDeactivatedQueueMatches) {
        return BindingBuilder.bind(poolDeactivatedQueueMatches)
                .to(deactivatedExchange)
                .with("pool.deactivated");
    }

    @Bean
    public Binding bindTeamDeactivatedByPoolQueueMatches(
            TopicExchange deactivatedExchange,
            Queue teamDeactivatedByPoolQueueMatches) {
        return BindingBuilder.bind(teamDeactivatedByPoolQueueMatches)
                .to(deactivatedExchange)
                .with("teambypool.deactivated");
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}