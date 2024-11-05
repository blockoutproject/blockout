// Package: com.blockout.teams.config

package com.blockout.teams.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // Exchange pour les événements Team
    public static final String TEAM_EXCHANGE = "team.exchange";

    // Queue pour consommer les événements de désactivation d'équipe
    public static final String TEAM_DEACTIVATION_QUEUE = "team.deactivation.queue";

    // Exchange pour les événements Pool (doit correspondre à celui défini dans le microservice Pool)
    public static final String POOL_EXCHANGE = "pool.exchange";

    // Queue pour consommer les événements Pool
    public static final String POOL_EVENT_QUEUE = "team.pool.queue";

    @Bean
    public TopicExchange teamExchange() {
        return new TopicExchange(TEAM_EXCHANGE);
    }

    @Bean
    public TopicExchange poolExchange() {
        return new TopicExchange(POOL_EXCHANGE);
    }

    @Bean
    public Queue poolEventQueue() {
        return new Queue(POOL_EVENT_QUEUE);
    }

    @Bean
    public Binding poolEventBinding() {
        // Lie la queue des événements Pool à l'exchange Pool pour les événements de désactivation
        return BindingBuilder.bind(poolEventQueue())
                .to(poolExchange())
                .with("pool.pooldeactivated");
    }
}