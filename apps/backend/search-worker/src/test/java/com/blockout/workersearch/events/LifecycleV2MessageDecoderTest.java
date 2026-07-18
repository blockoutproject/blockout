package com.blockout.workersearch.events;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.events.v2.model.ClubDeactivationV2Event;
import com.blockout.events.v2.model.ClubDeactivationV2Payload;
import com.blockout.events.v2.model.ClubUpsertV2Event;
import com.blockout.events.v2.model.ClubUpsertV2Payload;
import com.blockout.events.v2.model.EventType;
import com.blockout.events.v2.model.PoolDeactivationV2Event;
import com.blockout.events.v2.model.PoolDeactivationV2Payload;
import com.blockout.events.v2.model.PoolUpsertV2Event;
import com.blockout.events.v2.model.PoolUpsertV2Payload;
import com.blockout.events.v2.model.TeamDeactivationV2Event;
import com.blockout.events.v2.model.TeamDeactivationV2Payload;
import com.blockout.events.v2.model.TeamUpsertV2Event;
import com.blockout.events.v2.model.TeamUpsertV2Payload;
import com.blockout.workersearch.models.enums.Format;
import com.blockout.workersearch.models.enums.Gender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.OffsetDateTime;
import java.util.Date;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;

class LifecycleV2MessageDecoderTest {

    private static final OffsetDateTime OCCURRED_AT = OffsetDateTime.parse("2026-07-17T20:00Z");
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final LifecycleV2MessageDecoder decoder =
            new LifecycleV2MessageDecoder(objectMapper, new V2EventMetadataValidator());

    @Test
    void decodesAllSixGeneratedProjectionContracts() throws Exception {
        UUID clubUpsertId = UUID.randomUUID();
        UUID teamUpsertId = UUID.randomUUID();
        UUID poolUpsertId = UUID.randomUUID();
        UUID clubDeleteId = UUID.randomUUID();
        UUID teamDeleteId = UUID.randomUUID();
        UUID poolDeleteId = UUID.randomUUID();

        var club = decoder.clubUpsert(message(new ClubUpsertV2Event(
                null, null, clubUpsertId, EventType.CLUB_UPSERT, OCCURRED_AT, "club:c1",
                new ClubUpsertV2Payload("Paris", "c1", "logo", "Club"), "clubs-service", "2.0.0"),
                clubUpsertId, "CLUB_UPSERT", "clubs-service", "club:c1"));
        var team = decoder.teamUpsert(message(new TeamUpsertV2Event(
                null, null, teamUpsertId, EventType.TEAM_UPSERT, OCCURRED_AT, "team:2",
                new TeamUpsertV2Payload("c1", 3, "SIX", "F", 2, "logo", "Team", "2026", "T"),
                "teams-service", "2.0.0"), teamUpsertId, "TEAM_UPSERT", "teams-service", "team:2"));
        var pool = decoder.poolUpsert(message(new PoolUpsertV2Event(
                null, null, poolUpsertId, EventType.POOL_UPSERT, OCCURRED_AT, "pool:4",
                new PoolUpsertV2Payload(3, "FOUR", "M", 4, "L", "League", "Pool", "2026", "P"),
                "pools-service", "2.0.0"), poolUpsertId, "POOL_UPSERT", "pools-service", "pool:4"));
        var clubDelete = decoder.clubDeactivation(message(new ClubDeactivationV2Event(
                null, null, clubDeleteId, EventType.CLUB_DEACTIVATED, OCCURRED_AT, "club:c1",
                new ClubDeactivationV2Payload("c1"), "competition-service", "2.0.0"),
                clubDeleteId, "CLUB_DEACTIVATED", "competition-service", "club:c1"));
        var teamDelete = decoder.teamDeactivation(message(new TeamDeactivationV2Event(
                null, null, teamDeleteId, EventType.TEAM_DEACTIVATED, OCCURRED_AT, "team:2",
                new TeamDeactivationV2Payload(2), "competition-service", "2.0.0"),
                teamDeleteId, "TEAM_DEACTIVATED", "competition-service", "team:2"));
        var poolDelete = decoder.poolDeactivation(message(new PoolDeactivationV2Event(
                null, null, poolDeleteId, EventType.POOL_DEACTIVATED, OCCURRED_AT, "pool:4",
                new PoolDeactivationV2Payload(4), "competition-service", "2.0.0"),
                poolDeleteId, "POOL_DEACTIVATED", "competition-service", "pool:4"));

        assertThat(club.projectionEvent().getCity()).isEqualTo("Paris");
        assertThat(team.projectionEvent().getFormat()).isEqualTo(Format.SIX);
        assertThat(team.projectionEvent().getGender()).isEqualTo(Gender.F);
        assertThat(pool.projectionEvent().getFormat()).isEqualTo(Format.FOUR);
        assertThat(clubDelete.projectionEvent().getClubId()).isEqualTo("c1");
        assertThat(teamDelete.projectionEvent().getTeamId()).isEqualTo(2L);
        assertThat(poolDelete.projectionEvent().getPoolId()).isEqualTo(4L);
    }

    @Test
    void rejectsSpringTypeMetadataAndQueueContractMismatch() throws Exception {
        UUID eventId = UUID.randomUUID();
        var event = new ClubUpsertV2Event(
                null, null, eventId, EventType.CLUB_UPSERT, OCCURRED_AT, "club:c1",
                new ClubUpsertV2Payload("Paris", "c1", null, "Club"), "clubs-service", "2.0.0");
        Message withTypeId = message(event, eventId, "CLUB_UPSERT", "clubs-service", "club:c1");
        withTypeId.getMessageProperties().setHeader("__TypeId__", ClubUpsertV2Event.class.getName());

        assertThatThrownBy(() -> decoder.clubUpsert(withTypeId))
                .hasMessageContaining("must not contain __TypeId__");

        var wrongContractEvent = new ClubUpsertV2Event(
                null, null, eventId, EventType.TEAM_UPSERT, OCCURRED_AT, "club:c1",
                event.payload(), "clubs-service", "2.0.0");
        Message wrongContract = message(
                wrongContractEvent, eventId, "TEAM_UPSERT", "clubs-service", "club:c1");
        assertThatThrownBy(() -> decoder.clubUpsert(wrongContract))
                .hasMessageContaining("queue contract");
    }

    private Message message(Object event, UUID eventId, String type, String producer, String orderingKey)
            throws Exception {
        MessageProperties properties = new MessageProperties();
        properties.setMessageId(eventId.toString());
        properties.setType(type);
        properties.setTimestamp(Date.from(OCCURRED_AT.toInstant()));
        properties.setHeader("x-blockout-event-id", eventId.toString());
        properties.setHeader("x-blockout-schema-version", "2.0.0");
        properties.setHeader("x-blockout-producer", producer);
        properties.setHeader("x-blockout-ordering-key", orderingKey);
        return new Message(objectMapper.writeValueAsBytes(event), properties);
    }
}
