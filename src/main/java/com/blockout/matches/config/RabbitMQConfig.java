package com.blockout.matches.config;

import java.util.List;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.SimpleMessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String TEAM_DEACTIVATED_EXCHANGE = "team.deactivated.exchange";
    public static final String POOL_DEACTIVATED_EXCHANGE = "pool.deactivated.exchange";

    public static final String TEAM_DEACTIVATED_QUEUE_MATCHES = "team.deactivated.queue.matches";
    public static final String POOL_DEACTIVATED_QUEUE_MATCHES = "pool.deactivated.queue.matches";

    @Bean
    public FanoutExchange teamDeactivatedExchange() {
        return new FanoutExchange(TEAM_DEACTIVATED_EXCHANGE);
    }

    @Bean
    public FanoutExchange poolDeactivatedExchange() {
        return new FanoutExchange(POOL_DEACTIVATED_EXCHANGE);
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
    public Binding bindTeamDeactivatedQueueMatches(
            FanoutExchange teamDeactivatedExchange,
            @Qualifier("teamDeactivatedQueueMatches") Queue teamDeactivatedQueueMatches
    ) {
        return BindingBuilder.bind(teamDeactivatedQueueMatches).to(teamDeactivatedExchange);
    }

    @Bean
    public Binding bindPoolDeactivatedQueueMatches(
            FanoutExchange poolDeactivatedExchange,
            @Qualifier("poolDeactivatedQueueMatches") Queue poolDeactivatedQueueMatches
    ) {
        return BindingBuilder.bind(poolDeactivatedQueueMatches).to(poolDeactivatedExchange);
    }

    @Bean
    public SimpleMessageConverter messageConverter() {
        SimpleMessageConverter converter = new SimpleMessageConverter();
        converter.setAllowedListPatterns(List.of(
                "com.blockout.shared.events.*",
                "java.lang.*"));
        return converter;
    }
}