package com.blockout.workersearch;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.models.dto.club.ClubDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;

class SearchEventJsonContractCharacterizationTest {

    @Test
    void keepsTheExistingTeamEventPayloadInCamelCase() throws Exception {
        TeamUpsertEvent event = TeamUpsertEvent.builder()
                .id(10L)
                .name("Blockout")
                .shortName("BO")
                .clubId("club-1")
                .divisionId(20L)
                .logoUrl("https://example.invalid/team.png")
                .build();

        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        Message message = converter.toMessage(event, new MessageProperties());
        JsonNode json = new ObjectMapper().readTree(new String(message.getBody(), UTF_8));

        assertThat(json.path("shortName").asText()).isEqualTo("BO");
        assertThat(json.path("clubId").asText()).isEqualTo("club-1");
        assertThat(json.path("divisionId").asLong()).isEqualTo(20L);
        assertThat(json.path("logoUrl").asText()).isEqualTo("https://example.invalid/team.png");
        assertThat(json.has("short_name")).isFalse();
    }

    @Test
    void readsTheCompleteClubInternalResponseWithoutChangingTheSearchProjection() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

        ClubDTO club = objectMapper.readValue("""
                {
                  "id":"club-1",
                  "rawName":"RAW",
                  "name":"Club",
                  "address":"1 Club Street",
                  "city":"Paris",
                  "postalCode":"75001",
                  "email":"mail",
                  "phoneNumber":"phone",
                  "website":"website",
                  "logoUrl":"logo",
                  "active":true,
                  "latitude":48.0,
                  "longitude":2.0,
                  "createdAt":"2026-07-19T12:00:00",
                  "lastUpdate":"2026-07-19T12:00:00"
                }
                """, ClubDTO.class);

        assertThat(club.getAddress()).isEqualTo("1 Club Street");
        assertThat(club.getLatitude()).isEqualTo(48.0);
        assertThat(club.getCreatedAt()).isEqualTo(club.getLastUpdate());
        assertThat(club.isActive()).isTrue();
    }
}
