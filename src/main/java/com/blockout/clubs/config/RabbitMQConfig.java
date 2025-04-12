package com.blockout.clubs.config;

import org.springframework.amqp.core.*;
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
    public Queue teamDeactivatedQueueTeams() {
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
    
    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}