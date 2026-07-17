package com.blockout.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

class OutboxAmqpPublisher {

    static final String EVENT_ID_HEADER = "x-blockout-event-id";

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper legacyMapper;

    OutboxAmqpPublisher(RabbitTemplate rabbitTemplate, ObjectMapper legacyMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.legacyMapper = legacyMapper;
    }

    void publishV1(OutboxRow row) throws ClassNotFoundException, com.fasterxml.jackson.core.JsonProcessingException {
        Class<?> payloadType = Class.forName(row.v1PayloadType());
        Object payload = legacyMapper.readValue(row.v1Payload(), payloadType);
        rabbitTemplate.convertAndSend(row.exchange(), row.v1RoutingKey(), payload, message -> {
            message.getMessageProperties().setHeader(EVENT_ID_HEADER, row.eventId().toString());
            return message;
        });
    }

    void publishV2(OutboxRow row) {
        MessageProperties properties = new MessageProperties();
        properties.setContentType(MessageProperties.CONTENT_TYPE_JSON);
        properties.setContentEncoding(StandardCharsets.UTF_8.name());
        properties.setMessageId(row.eventId().toString());
        properties.setType(row.eventType());
        properties.setTimestamp(Date.from(row.occurredAt()));
        if (row.correlationId() != null) {
            properties.setCorrelationId(row.correlationId());
        }
        properties.setHeader(EVENT_ID_HEADER, row.eventId().toString());
        properties.setHeader("x-blockout-schema-version", row.schemaVersion());
        properties.setHeader("x-blockout-producer", row.producer());
        properties.setHeader("x-blockout-ordering-key", row.orderingKey());
        if (row.aggregateVersion() != null) {
            properties.setHeader("x-blockout-aggregate-version", row.aggregateVersion());
        }
        rabbitTemplate.send(
                row.exchange(), row.v2RoutingKey(),
                new Message(row.v2Payload().getBytes(StandardCharsets.UTF_8), properties));
    }
}
