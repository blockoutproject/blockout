package com.blockout.clubs;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.clubs.models.dto.ClubUpdateDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class ClubJsonContractCharacterizationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializesClubFieldsWithTheCamelCaseContract() throws Exception {
        ClubUpdateDTO club = ClubUpdateDTO.builder()
                .id("club-1")
                .rawName("RAW CLUB")
                .postalCode("75001")
                .logoUrl("https://example.invalid/logo.png")
                .phoneNumber("0102030405")
                .build();

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsBytes(club));

        assertThat(json.path("rawName").asText()).isEqualTo("RAW CLUB");
        assertThat(json.path("postalCode").asText()).isEqualTo("75001");
        assertThat(json.path("logoUrl").asText()).isEqualTo("https://example.invalid/logo.png");
        assertThat(json.path("phoneNumber").asText()).isEqualTo("0102030405");
        assertThat(json.has("raw_name")).isFalse();
    }
}
