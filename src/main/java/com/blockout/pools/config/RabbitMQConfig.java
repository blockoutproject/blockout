package com.blockout.pools.config;

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

    public static final String POOL_DEACTIVATED_EXCHANGE = "pool.deactivated.exchange";

    public static final String POOL_DEACTIVATED_QUEUE_POOLS = "pool.deactivated.queue.pools";

    @Bean
    public Queue poolDeactivatedQueuePools() {
        return new Queue(POOL_DEACTIVATED_QUEUE_POOLS, true);
    }

    @Bean
    public FanoutExchange poolDeactivatedExchange() {
        return new FanoutExchange(POOL_DEACTIVATED_EXCHANGE);
    }

    @Bean
    public Binding bindPoolDeactivatedQueuePools(
            FanoutExchange poolDeactivatedExchange,
            Queue poolDeactivatedQueuePools) {
        return BindingBuilder.bind(poolDeactivatedQueuePools)
                .to(poolDeactivatedExchange);
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