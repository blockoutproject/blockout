package com.blockout.clubs.club.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.clubs.club.api.models.ClubInternalResponse;
import com.blockout.clubs.club.api.models.CreateClubInternalRequest;
import com.blockout.clubs.club.api.models.UpdateClubInternalRequest;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/** Protects the complete generated Club transport shape and native camelCase names. */
@DisplayName("Club API contract")
class ClubApiContractUnitTest {

  private static final Set<String> COMPLETE_CLUB_FIELDS =
      Set.of(
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

  private final ObjectMapper objectMapper = JsonMapper.builder().build();

  /** Verifies that Spring routes come from the generated server interface. */
  @DisplayName("implements the generated Club API")
  @Test
  void implementsTheGeneratedClubApi() {
    assertThat(ClubApi.class).isAssignableFrom(ClubController.class);
  }

  /** Verifies that the owner exposes every complete Club field without naming conversion. */
  @DisplayName("exposes the complete Club shape in native camelCase")
  @Test
  void exposesTheCompleteAuthoritativeClubShapeInNativeCamelCase() {
    ClubInternalResponse response =
        new ClubInternalResponse("club-1", "RAW CLUB", "Blockout Club", true)
            .address("1 Club Street")
            .city("Paris")
            .postalCode("75001")
            .email("club@example.invalid")
            .phoneNumber("0102030405")
            .website("https://example.invalid")
            .logoUrl("https://example.invalid/logo.png")
            .latitude(48.8566)
            .longitude(2.3522);

    JsonNode json = objectMapper.valueToTree(response);
    assertThat(json.propertyNames()).containsExactlyInAnyOrderElementsOf(COMPLETE_CLUB_FIELDS);
    assertThat(json.path("rawName").asText()).isEqualTo("RAW CLUB");
    assertThat(json.has("raw_name")).isFalse();
  }

  /** Verifies that creation and update remain distinct generated transport inputs. */
  @DisplayName("keeps creation and update requests explicit")
  @Test
  void keepsCreationAndUpdateRequestsExplicit() throws Exception {
    CreateClubInternalRequest create =
        objectMapper.readValue(
            """
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
            """,
            CreateClubInternalRequest.class);
    UpdateClubInternalRequest update =
        objectMapper.readValue(
            """
            {"name":"New name","address":"2 Club Street","logoUrl":null}
            """,
            UpdateClubInternalRequest.class);

    assertThat(create.getAddress()).isEqualTo("1 Club Street");
    assertThat(create.getLogoUrl()).isEqualTo("https://example.invalid/logo.png");
    assertThat(update.getName()).isEqualTo("New name");
    assertThat(update.getAddress()).isEqualTo("2 Club Street");
    assertThat(update.getLogoUrl()).isNull();
  }
}
