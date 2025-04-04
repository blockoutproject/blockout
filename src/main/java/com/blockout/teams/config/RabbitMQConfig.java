package com.blockout.teams.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String DEACTIVATED_EXCHANGE = "deactivated.exchange";
    public static final String TEAM_DEACTIVATED_QUEUE_TEAMS = "team.deactivated.queue.teams";

    @Bean
    public TopicExchange deactivatedExchange() {
        return new TopicExchange(DEACTIVATED_EXCHANGE);
    }

    @Bean
    public Queue teamDeactivatedQueueTeams() {
        return new Queue(TEAM_DEACTIVATED_QUEUE_TEAMS, true);
    }

    @Bean
    public Binding bindTeamDeactivatedQueueTeams(
            TopicExchange deactivatedExchange,
            Queue teamDeactivatedQueueTeams) {
        return BindingBuilder.bind(teamDeactivatedQueueTeams)
                .to(deactivatedExchange)
                .with("team.deactivated");
    }

    public static final String USER_FOLLOW_EXCHANGE = "user.follow.exchange";
    public static final String TEAM_FOLLOW_QUEUE = "user.follow.queue.teams";
    private static final String TEAM_ROUTING_KEY_PATTERN = "team.*";

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
        // On écoute les routingKeys “team.*”
        return BindingBuilder.bind(userFollowQueueTeams)
                .to(userFollowExchange)
                .with(TEAM_ROUTING_KEY_PATTERN);
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}