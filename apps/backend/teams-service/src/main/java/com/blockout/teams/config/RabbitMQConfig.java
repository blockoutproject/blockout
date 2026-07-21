package com.blockout.teams.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String ENTITY_LIFECYCLE_EXCHANGE = "entity.lifecycle.exchange";

    public static final String TEAM_DEACTIVATION_QUEUE_TEAMS = "team.deactivation.queue.teams";
    public static final String CLUB_DEACTIVATION_QUEUE_TEAMS = "club.deactivation.queue.teams";
    public static final String USER_FOLLOW_EXCHANGE = "user.follow.exchange";
    public static final String TEAM_FOLLOW_QUEUE = "team.follow.queue.teams";

    @Bean
    public TopicExchange entityLifecycleExchange() {
        return new TopicExchange(ENTITY_LIFECYCLE_EXCHANGE);
    }

    @Bean
    public Queue teamDeactivationQueueTeams() {
        return new Queue(TEAM_DEACTIVATION_QUEUE_TEAMS, true);
    }

    @Bean
    public Queue clubDeactivationQueueTeams() {
        return new Queue(CLUB_DEACTIVATION_QUEUE_TEAMS, true);
    }

    @Bean
    public Binding bindTeamDeactivationQueueTeams(
        TopicExchange entityLifecycleExchange,
        Queue teamDeactivationQueueTeams) {
        return BindingBuilder.bind(teamDeactivationQueueTeams)
            .to(entityLifecycleExchange)
            .with("team.deactivation");
    }

    @Bean
    public Binding bindClubDeactivationQueueTeams(
        TopicExchange entityLifecycleExchange,
        Queue clubDeactivationQueueTeams) {
        return BindingBuilder.bind(clubDeactivationQueueTeams)
            .to(entityLifecycleExchange)
            .with("club.deactivation");
    }

    @Bean
    public TopicExchange userFollowExchange() {
        return new TopicExchange(USER_FOLLOW_EXCHANGE);
    }

    @Bean
    public Queue userFollowQueueTeams() {
        return new Queue(TEAM_FOLLOW_QUEUE, true);
    }

    @Bean
    public Binding bindUserFollowQueueTeams(
        Queue userFollowQueueTeams,
        TopicExchange userFollowExchange) {
        return BindingBuilder.bind(userFollowQueueTeams)
            .to(userFollowExchange)
            .with("team.follow");
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
