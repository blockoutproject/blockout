package com.blockout.clubs.listeners;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.events.v2.model.ClubDeactivationV2Event;
import com.blockout.events.v2.model.ClubDeactivationV2Payload;
import com.blockout.events.v2.model.EventType;
import com.blockout.outbox.V2EventMetadataValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.OffsetDateTime;
import java.util.Date;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;

class ClubLifecycleV2MessageDecoderTest {

    private static final OffsetDateTime OCCURRED_AT = OffsetDateTime.parse("2026-07-17T20:00Z");
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final ClubLifecycleV2MessageDecoder decoder =
            new ClubLifecycleV2MessageDecoder(objectMapper, new V2EventMetadataValidator());

    @Test
    void decodesTheGeneratedContractAndRejectsSpringTypeMetadata() throws Exception {
        UUID eventId = UUID.randomUUID();
        var event = new ClubDeactivationV2Event(
                null, null, eventId, EventType.CLUB_DEACTIVATED, OCCURRED_AT, "club:c1",
                new ClubDeactivationV2Payload("c1"), "competition-service", "2.0.0");
        Message message = message(event, eventId, "CLUB_DEACTIVATED", "club:c1");

        assertThat(decoder.decode(message).payload().clubId()).isEqualTo("c1");

        message.getMessageProperties().setHeader("__TypeId__", ClubDeactivationV2Event.class.getName());
        assertThatThrownBy(() -> decoder.decode(message)).hasMessageContaining("must not contain __TypeId__");
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
