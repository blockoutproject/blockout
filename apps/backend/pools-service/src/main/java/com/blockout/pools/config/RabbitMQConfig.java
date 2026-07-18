package com.blockout.pools.config;

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

    public static final String POOL_DEACTIVATION_QUEUE_POOLS = "pool.deactivation.queue.pools";
    public static final String POOL_DEACTIVATION_QUEUE_POOLS_V2 = "pool.deactivation.queue.pools.v2";

    @Bean
    public TopicExchange entityLifecycleExchange() {
        return new TopicExchange(ENTITY_LIFECYCLE_EXCHANGE);
    }

    @Bean
    public Queue poolDeactivationQueuePools() {
        return new Queue(POOL_DEACTIVATION_QUEUE_POOLS, true);
    }

    @Bean
    public Queue poolDeactivationQueuePoolsV2() {
        return new Queue(POOL_DEACTIVATION_QUEUE_POOLS_V2, true);
    }

    @Bean
    public Binding bindPoolDeactivationQueuePools(
            TopicExchange entityLifecycleExchange,
            Queue poolDeactivationQueuePools) {
        return BindingBuilder.bind(poolDeactivationQueuePools)
                .to(entityLifecycleExchange)
                .with("pool.deactivation");
    }

    @Bean
    public Binding bindPoolDeactivationQueuePoolsV2(
            TopicExchange entityLifecycleExchange,
            Queue poolDeactivationQueuePoolsV2) {
        return BindingBuilder.bind(poolDeactivationQueuePoolsV2)
                .to(entityLifecycleExchange)
                .with("pool.deactivation.v2");
    }

    public static final String USER_FOLLOW_EXCHANGE = "user.follow.exchange";
    public static final String POOL_FOLLOW_QUEUE = "pool.follow.queue.pools";

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

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(messageConverter());
        return rabbitTemplate;
    }
}
