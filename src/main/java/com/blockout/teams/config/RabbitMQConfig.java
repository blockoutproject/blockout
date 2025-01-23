package com.blockout.teams.config;

import java.util.List;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.SimpleMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String TEAM_DEACTIVATED_EXCHANGE = "team.deactivated.exchange";

    public static final String TEAM_DEACTIVATED_QUEUE_TEAMS = "team.deactivated.queue.teams";

    @Bean
    public Queue teamDeactivatedQueueTeams() {
        return new Queue(TEAM_DEACTIVATED_QUEUE_TEAMS, true);
    }

    @Bean
    public FanoutExchange teamDeactivatedExchange() {
        return new FanoutExchange(TEAM_DEACTIVATED_EXCHANGE);
    }

    @Bean
    public Binding bindTeamDeactivatedQueueTeams(
            FanoutExchange teamDeactivatedExchange,
            Queue teamDeactivatedQueueTeams) {
        return BindingBuilder.bind(teamDeactivatedQueueTeams)
                .to(teamDeactivatedExchange);
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