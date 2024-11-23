package com.blockout.matches.config;

import java.util.List;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.SimpleMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;

@Configuration
public class RabbitMQConfig {

    public static final String POOL_DEACTIVATED_QUEUE_MATCH = "pool.deactivated.queue.match";
    public static final String POOL_DEACTIVATED_EXCHANGE = "pool.deactivated.exchange";

    public static final String TEAM_DEACTIVATED_QUEUE = "team.deactivated.queue";
    public static final String TEAM_DEACTIVATED_EXCHANGE = "team.deactivated.exchange";

    @Bean
    public Queue poolDeactivatedQueueMatch() {
        return new Queue(POOL_DEACTIVATED_QUEUE_MATCH, true);
    }

    @Bean
    public FanoutExchange poolDeactivatedExchange() {
        return new FanoutExchange(POOL_DEACTIVATED_EXCHANGE);
    }

    @Bean
    public Binding poolBindingMatch(FanoutExchange poolDeactivatedExchange, Queue poolDeactivatedQueueMatch) {
        return BindingBuilder.bind(poolDeactivatedQueueMatch).to(poolDeactivatedExchange);
    }

    @Bean
    public Queue teamDeactivatedQueue() {
        return new Queue(TEAM_DEACTIVATED_QUEUE, true);
    }

    @Bean
    public FanoutExchange teamDeactivatedExchange() {
        return new FanoutExchange(TEAM_DEACTIVATED_EXCHANGE);
    }

    @Bean
    public Binding teamBindingMatch(FanoutExchange teamDeactivatedExchange, Queue teamDeactivatedQueue) {
        return BindingBuilder.bind(teamDeactivatedQueue).to(teamDeactivatedExchange);
    }

    @Bean
    public SimpleMessageConverter messageConverter() {
        SimpleMessageConverter converter = new SimpleMessageConverter();
        converter.setAllowedListPatterns(List.of(
            "com.blockout.shared.events.PoolDeactivatedEvent",
            "com.blockout.shared.events.TeamDeactivatedEvent",
            "java.lang.*"));
        return converter;
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(messageConverter());
        return rabbitTemplate;
    }
}