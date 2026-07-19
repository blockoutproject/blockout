package com.blockout.clubs;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.clubs.models.dto.ClubUpdateDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class ClubJsonContractCharacterizationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializesExplicitClubFieldsWithTheCurrentSnakeCaseContract() throws Exception {
        ClubUpdateDTO club = ClubUpdateDTO.builder()
                .id("club-1")
                .rawName("RAW CLUB")
                .postalCode("75001")
                .logoUrl("https://example.invalid/logo.png")
                .phoneNumber("0102030405")
                .build();

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsBytes(club));

        assertThat(json.path("raw_name").asText()).isEqualTo("RAW CLUB");
        assertThat(json.path("postal_code").asText()).isEqualTo("75001");
        assertThat(json.path("logo_url").asText()).isEqualTo("https://example.invalid/logo.png");
        assertThat(json.path("phone_number").asText()).isEqualTo("0102030405");
        assertThat(json.has("rawName")).isFalse();
    }
}
