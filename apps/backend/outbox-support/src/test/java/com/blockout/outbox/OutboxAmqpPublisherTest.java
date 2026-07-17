package com.blockout.outbox;

import static org.assertj.core.api.Assertions.assertThat;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

class OutboxAmqpPublisherTest {

    @Test
    void v1PreservesTheLegacyPayloadAndAddsOnlyTheSharedEventId() throws Exception {
        RecordingRabbitTemplate template = new RecordingRabbitTemplate();
        ObjectMapper httpMapper = new ObjectMapper()
                .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
        OutboxAmqpPublisher publisher = new OutboxAmqpPublisher(template, httpMapper);
        OutboxRow row = row(null, true, null, "{\"name\":\"Volley Club\"}");

        publisher.publishV1(row);

        assertThat(template.exchange).isEqualTo("entity.lifecycle.exchange");
        assertThat(template.routingKey).isEqualTo("club.upsert");
        assertThat(template.payload).isEqualTo(new LegacyPayload("Volley Club"));
        assertThat(template.message.getMessageProperties().getHeaders())
                .hasSize(1)
                .containsEntry(OutboxAmqpPublisher.EVENT_ID_HEADER, row.eventId().toString());
    }

    @Test
    void v2UsesCanonicalBodyStandardPropertiesAndStableHeadersWithoutTypeId() {
        RecordingRabbitTemplate template = new RecordingRabbitTemplate();
        OutboxAmqpPublisher publisher = new OutboxAmqpPublisher(template, new ObjectMapper());
        OutboxRow row = row(null, true, null, "{\"name\":\"Volley Club\"}");

        publisher.publishV2(row);

        assertThat(template.exchange).isEqualTo("entity.lifecycle.exchange");
        assertThat(template.routingKey).isEqualTo("club.upsert.v2");
        assertThat(new String(template.message.getBody())).isEqualTo("{\"displayName\":\"Volley Club\"}");
        var properties = template.message.getMessageProperties();
        assertThat(properties.getContentType()).isEqualTo("application/json");
        assertThat(properties.getMessageId()).isEqualTo(row.eventId().toString());
        assertThat(properties.getType()).isEqualTo("CLUB_UPSERT");
        assertThat(properties.getCorrelationId()).isEqualTo("correlation-1");
        assertThat(properties.getHeaders())
                .containsEntry(OutboxAmqpPublisher.EVENT_ID_HEADER, row.eventId().toString())
                .containsEntry("x-blockout-schema-version", "2.0.0")
                .containsEntry("x-blockout-producer", "clubs-service")
                .containsEntry("x-blockout-ordering-key", "club:1")
                .doesNotContainKey("__TypeId__")
                .doesNotContainKey("x-blockout-aggregate-version");
    }

    private OutboxRow row(
            Instant v1PublishedAt, boolean v2Enabled, Instant v2PublishedAt, String v1Payload) {
        return new OutboxRow(
                UUID.fromString("d8c91431-687c-4f30-ab3d-8f1cce8eef83"),
                "CLUB_UPSERT", "2.0.0", "clubs-service", "club:1", null, "correlation-1",
                Instant.parse("2026-07-17T20:00:00Z"), "entity.lifecycle.exchange", "club.upsert",
                v1Payload, LegacyPayload.class.getName(), v1PublishedAt, v2Enabled,
                "club.upsert.v2", "{\"displayName\":\"Volley Club\"}", v2PublishedAt, 0);
    }

    public record LegacyPayload(String name) {
    }

    private static final class RecordingRabbitTemplate extends RabbitTemplate {
        private String exchange;
        private String routingKey;
        private Object payload;
        private Message message;

        @Override
        public void convertAndSend(
                String exchange, String routingKey, Object payload, MessagePostProcessor messagePostProcessor) {
            this.exchange = exchange;
            this.routingKey = routingKey;
            this.payload = payload;
            this.message = messagePostProcessor.postProcessMessage(new Message(new byte[0]));
        }

        @Override
        public void send(String exchange, String routingKey, Message message) {
            this.exchange = exchange;
            this.routingKey = routingKey;
            this.message = message;
        }
    }
}
