package com.blockout.competitions.config;

import java.util.List;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.SimpleMessageConverter;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String POOL_DEACTIVATED_EXCHANGE = "pool.deactivated.exchange";
    public static final String TEAM_DEACTIVATED_EXCHANGE = "team.deactivated.exchange";

    @Bean
    public FanoutExchange poolDeactivatedExchange() {
        return new FanoutExchange(POOL_DEACTIVATED_EXCHANGE);
    }

    @Bean
    public FanoutExchange teamDeactivatedExchange() {
        return new FanoutExchange(TEAM_DEACTIVATED_EXCHANGE);
    }

    @Bean
    public SimpleMessageConverter messageConverter() {
        SimpleMessageConverter converter = new SimpleMessageConverter();
        converter.setAllowedListPatterns(List.of(
                "com.blockout.shared.events.*",
                "java.lang.*"
        ));
        return converter;
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(messageConverter());
        return rabbitTemplate;
    }
}