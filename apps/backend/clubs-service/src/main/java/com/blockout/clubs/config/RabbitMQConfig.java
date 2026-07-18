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

    public static final String ENTITY_LIFECYCLE_EXCHANGE = "entity.lifecycle.exchange";

    public static final String CLUB_DEACTIVATION_QUEUE_CLUBS = "club.deactivation.queue.clubs";
    public static final String CLUB_DEACTIVATION_QUEUE_CLUBS_V2 = "club.deactivation.queue.clubs.v2";

    @Bean
    public TopicExchange entityLifecycleExchange() {
        return new TopicExchange(ENTITY_LIFECYCLE_EXCHANGE);
    }

    @Bean
    public Queue clubDeactivationQueueClubs() {
        return new Queue(CLUB_DEACTIVATION_QUEUE_CLUBS, true);
    }

    @Bean
    public Queue clubDeactivationQueueClubsV2() {
        return new Queue(CLUB_DEACTIVATION_QUEUE_CLUBS_V2, true);
    }

    @Bean
    public Binding bindClubDeactivationQueueClubs(
            TopicExchange entityLifecycleExchange,
            Queue clubDeactivationQueueClubs) {
        return BindingBuilder.bind(clubDeactivationQueueClubs)
                .to(entityLifecycleExchange)
                .with("club.deactivation");
    }

    @Bean
    public Binding bindClubDeactivationQueueClubsV2(
            TopicExchange entityLifecycleExchange,
            Queue clubDeactivationQueueClubsV2) {
        return BindingBuilder.bind(clubDeactivationQueueClubsV2)
                .to(entityLifecycleExchange)
                .with("club.deactivation.v2");
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
