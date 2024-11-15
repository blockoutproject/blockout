package com.blockout.pools.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.SimpleMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class RabbitMQConfig {

    public static final String POOL_DEACTIVATED_EXCHANGE = "pool.deactivated.exchange";
    public static final String POOL_DEACTIVATED_QUEUE_TEAM = "pool.deactivated.queue.team";
    public static final String POOL_DEACTIVATED_QUEUE_MATCH = "pool.deactivated.queue.match";

    @Bean
    public FanoutExchange poolDeactivatedExchange() {
        return new FanoutExchange(POOL_DEACTIVATED_EXCHANGE);
    }

    @Bean
    public Queue poolDeactivatedQueueTeam() {
        return new Queue(POOL_DEACTIVATED_QUEUE_TEAM, true);
    }

    @Bean
    public Queue poolDeactivatedQueueMatch() {
        return new Queue(POOL_DEACTIVATED_QUEUE_MATCH, true);
    }

    @Bean
    public Binding bindingTeamQueue(FanoutExchange poolDeactivatedExchange, Queue poolDeactivatedQueueTeam) {
        return BindingBuilder.bind(poolDeactivatedQueueTeam).to(poolDeactivatedExchange);
    }

    @Bean
    public Binding bindingMatchQueue(FanoutExchange poolDeactivatedExchange, Queue poolDeactivatedQueueMatch) {
        return BindingBuilder.bind(poolDeactivatedQueueMatch).to(poolDeactivatedExchange);
    }

    @Bean
    public SimpleMessageConverter messageConverter() {
        SimpleMessageConverter converter = new SimpleMessageConverter();
        converter.setAllowedListPatterns(List.of("com.blockout.shared.events.PoolDeactivatedEvent", "java.lang.*"));
        return converter;
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(messageConverter());
        return rabbitTemplate;
    }
}