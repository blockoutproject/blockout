package com.blockout.clubs.club.api;

import com.blockout.clubs.club.api.models.ClubInternalResponse;
import com.blockout.clubs.club.api.models.CreateClubInternalRequest;
import com.blockout.clubs.club.api.models.UpdateClubInternalRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Protects the complete handwritten Club transport shape and native camelCase names.
 */
@DisplayName("Club API contract")
class ClubApiContractUnitTest {

    private static final Set<String> COMPLETE_CLUB_FIELDS = Set.of(
        "id",
        "rawName",
        "name",
        "address",
        "city",
        "postalCode",
        "email",
        "phoneNumber",
        "website",
        "logoUrl",
        "active",
        "latitude",
        "longitude",
        "createdAt",
        "lastUpdate");

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Verifies that the owner exposes every complete Club field without naming conversion.
     */
    @DisplayName("exposes the complete Club shape in native camelCase")
    @Test
    void exposesTheCompleteAuthoritativeClubShapeInNativeCamelCase() {
        ClubInternalResponse response = new ClubInternalResponse(
            "club-1",
            "RAW CLUB",
            "Blockout Club",
            "1 Club Street",
            "Paris",
            "75001",
            "club@example.invalid",
            "0102030405",
            "https://example.invalid",
            "https://example.invalid/logo.png",
            true,
            48.8566,
            2.3522,
            null,
            null);

        JsonNode json = objectMapper.valueToTree(response);
        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrderElementsOf(COMPLETE_CLUB_FIELDS);
        assertThat(json.path("rawName").asText()).isEqualTo("RAW CLUB");
        assertThat(json.has("raw_name")).isFalse();
    }

    /**
     * Verifies that creation and update remain distinct handwritten transport inputs.
     */
    @DisplayName("keeps creation and update requests explicit")
    @Test
    void keepsCreationAndUpdateRequestsExplicit() throws Exception {
        CreateClubInternalRequest create = objectMapper.readValue("""
            {
              "id": "club-1",
              "rawName": "RAW CLUB",
              "name": "Blockout Club",
              "address": "1 Club Street",
              "city": "Paris",
              "postalCode": "75001",
              "email": null,
              "phoneNumber": null,
              "website": null,
              "logoUrl": "https://example.invalid/logo.png"
            }
            """, CreateClubInternalRequest.class);
        UpdateClubInternalRequest update = objectMapper.readValue("""
            {"name":"New name","address":"2 Club Street","logoUrl":null}
            """, UpdateClubInternalRequest.class);

        assertThat(create.address()).isEqualTo("1 Club Street");
        assertThat(create.logoUrl()).isEqualTo("https://example.invalid/logo.png");
        assertThat(update.name()).isEqualTo("New name");
        assertThat(update.address()).isEqualTo("2 Club Street");
        assertThat(update.logoUrl()).isNull();
    }
}
