package com.blockout.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(OutboxProperties.class)
public class OutboxConfiguration {

    @Bean
    Clock outboxClock() {
        return Clock.systemUTC();
    }

    @Bean
    OutboxStore outboxStore(JdbcTemplate jdbcTemplate) {
        return new JdbcOutboxStore(jdbcTemplate);
    }

    @Bean
    public OutboxRecorder outboxWriter(OutboxStore store, ObjectMapper objectMapper, Clock outboxClock) {
        return new OutboxWriter(store, objectMapper, outboxClock);
    }

    @Bean
    OutboxAmqpPublisher outboxAmqpPublisher(RabbitTemplate rabbitTemplate, ObjectMapper objectMapper) {
        return new OutboxAmqpPublisher(rabbitTemplate, objectMapper);
    }

    @Bean
    OutboxPublisherJob outboxPublisherJob(
            OutboxStore store,
            OutboxAmqpPublisher publisher,
            OutboxProperties properties,
            Clock outboxClock) {
        return new OutboxPublisherJob(store, publisher, properties, outboxClock);
    }
}
