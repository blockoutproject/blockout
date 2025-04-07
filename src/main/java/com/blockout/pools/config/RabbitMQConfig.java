package com.blockout.pools.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String DEACTIVATED_EXCHANGE = "deactivated.exchange";
    public static final String POOL_DEACTIVATED_QUEUE_POOLS = "pool.deactivated.queue.pools";

    @Bean
    public TopicExchange deactivatedExchange() {
        return new TopicExchange(DEACTIVATED_EXCHANGE);
    }

    @Bean
    public Queue poolDeactivatedQueuePools() {
        return new Queue(POOL_DEACTIVATED_QUEUE_POOLS, true);
    }

    @Bean
    public Binding bindPoolDeactivatedQueuePools(
            TopicExchange deactivatedExchange,
            Queue poolDeactivatedQueuePools) {
        return BindingBuilder.bind(poolDeactivatedQueuePools)
                .to(deactivatedExchange)
                .with("pool.deactivated");
    }

    public static final String USER_FOLLOW_EXCHANGE = "user.follow.exchange";
    public static final String POOL_FOLLOW_QUEUE = "pool.follow.queue";

    @Bean
    public TopicExchange userFollowExchange() {
        return new TopicExchange(USER_FOLLOW_EXCHANGE);
    }

    @Bean
    public Queue userFollowQueuePools() {
        return new Queue(POOL_FOLLOW_QUEUE, true);
    }

    @Bean
    public Binding bindUserFollowQueuePools(
            Queue userFollowQueuePools,
            TopicExchange userFollowExchange) {
        return BindingBuilder.bind(userFollowQueuePools)
                .to(userFollowExchange)
                .with("pool.follow");
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}