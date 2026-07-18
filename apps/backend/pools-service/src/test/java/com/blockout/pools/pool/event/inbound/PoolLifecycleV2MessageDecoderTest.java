package com.blockout.pools.pool.event.inbound;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.PoolDeactivationV2Event;
import com.blockout.events.v2.model.PoolDeactivationV2Payload;
import com.blockout.outbox.V2EventMetadataValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.OffsetDateTime;
import java.util.Date;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;

class PoolLifecycleV2MessageDecoderTest {

    private static final OffsetDateTime OCCURRED_AT = OffsetDateTime.parse("2026-07-17T20:00Z");
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final PoolLifecycleV2MessageDecoder decoder =
            new PoolLifecycleV2MessageDecoder(objectMapper, new V2EventMetadataValidator());

    @Test
    void decodesTheGeneratedContractAndRejectsTheWrongQueueContract() throws Exception {
        UUID eventId = UUID.randomUUID();
        var event = new PoolDeactivationV2Event(
                null, null, eventId, EventType.POOL_DEACTIVATED, OCCURRED_AT, "pool:4",
                new PoolDeactivationV2Payload(4L), "competition-service", "2.0.0");

        assertThat(decoder.decode(message(event, eventId, "POOL_DEACTIVATED", "pool:4"))
                .poolId()).isEqualTo(4L);

        var wrong = new PoolDeactivationV2Event(
                null, null, eventId, EventType.POOL_DEACTIVATED, OCCURRED_AT, "pool:5",
                event.payload(), "competition-service", "2.0.0");
        assertThatThrownBy(() -> decoder.decode(message(wrong, eventId, "POOL_DEACTIVATED", "pool:5")))
                .hasMessageContaining("queue contract");
    }

    private Message message(Object body, UUID eventId, String type, String orderingKey) throws Exception {
        var properties = new MessageProperties();
        properties.setMessageId(eventId.toString());
        properties.setType(type);
        properties.setTimestamp(Date.from(OCCURRED_AT.toInstant()));
        properties.setHeader("x-blockout-event-id", eventId.toString());
        properties.setHeader("x-blockout-schema-version", "2.0.0");
        properties.setHeader("x-blockout-producer", "competition-service");
        properties.setHeader("x-blockout-ordering-key", orderingKey);
        return new Message(objectMapper.writeValueAsBytes(body), properties);
    }
}
