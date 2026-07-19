package com.blockout.clubs.club.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.clubs.club.api.v2.ClubApiMapper;
import com.blockout.clubs.club.api.v2.ClubLogoV2Controller;
import com.blockout.clubs.club.api.v2.ClubV2Controller;
import com.blockout.clubs.club.application.ClubView;
import com.blockout.clubs.generated.api.ClubLogosApi;
import com.blockout.clubs.generated.api.ClubsApi;
import com.blockout.clubs.generated.model.ClubInternalResponse;
import com.blockout.clubs.generated.model.UpdateClubInternalRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.mock.web.MockMultipartFile;

class ClubV2BoundaryTest {

    @Test
    void controllersImplementTheGeneratedBoundaries() {
        assertThat(ClubsApi.class).isAssignableFrom(ClubV2Controller.class);
        assertThat(ClubLogosApi.class).isAssignableFrom(ClubLogoV2Controller.class);
    }

    @Test
    void generatedResponseUsesCanonicalCamelCaseWithTheDefaultMapper() throws Exception {
        ClubApiMapper mapper = Mappers.getMapper(ClubApiMapper.class);
        ClubInternalResponse response = mapper.toResponse(new ClubView(
                "club-1", "Raw", "Club", null, "Paris", "75001", null, "0102", null, null, true, 3L,
                48.8, 2.3, LocalDateTime.now(), LocalDateTime.now()));
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

        String body = objectMapper.writeValueAsString(response);

        assertThat(body).contains("\"rawName\"", "\"postalCode\"", "\"phoneNumber\"");
        assertThat(body).contains("\"revision\":3");
        assertThat(body).doesNotContain("raw_name", "postal_code", "phone_number", "createdAt", "lastUpdate");
    }

    @Test
    void canonicalUpdateRejectsConflictingLogoIntents() {
        ClubV2Controller controller = new ClubV2Controller(null, Mappers.getMapper(ClubApiMapper.class));
        UpdateClubInternalRequest request = new UpdateClubInternalRequest(true);
        MockMultipartFile image = new MockMultipartFile("image", "logo.png", "image/png", new byte[]{1});

        assertThatThrownBy(() -> controller.updateClub("club-1", request, image))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("removeLogo");
    }
}
