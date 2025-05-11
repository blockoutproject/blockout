package com.blockout.clubs.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String DEACTIVATED_EXCHANGE = "deactivated.exchange";
    public static final String CLUB_DEACTIVATED_QUEUE_CLUBS = "club.deactivated.queue.clubs";

    @Bean
    public TopicExchange deactivatedExchange() {
        return new TopicExchange(DEACTIVATED_EXCHANGE);
    }

    @Bean
    public Queue clubDeactivatedQueueClubs() {
        return new Queue(CLUB_DEACTIVATED_QUEUE_CLUBS, true);
    }

    @Bean
    public Binding bindClubDeactivatedQueueClubs(
            TopicExchange deactivatedExchange,
            Queue clubDeactivatedQueueClubs) {
        return BindingBuilder.bind(clubDeactivatedQueueClubs)
                .to(deactivatedExchange)
                .with("club.deactivated");
    }

    public static final String ENTITY_LIFECYCLE_EXCHANGE = "entity.lifecycle.exchange";

    @Bean
    public TopicExchange entityLifecycleExchange() {
        return new TopicExchange(ENTITY_LIFECYCLE_EXCHANGE);
    }
    
    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(messageConverter());
        return rabbitTemplate;
    }
}