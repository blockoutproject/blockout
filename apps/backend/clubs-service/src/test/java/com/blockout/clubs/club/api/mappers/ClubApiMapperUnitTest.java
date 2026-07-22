package com.blockout.clubs.club.api.mappers;

import com.blockout.clubs.club.api.models.CreateClubInternalRequest;
import com.blockout.clubs.club.application.commands.CreateClubCommand;
import com.blockout.clubs.club.application.views.ClubView;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies the explicit Club transport-to-application mapping boundary.
 */
@DisplayName("Club API mapper")
class ClubApiMapperUnitTest {

    private final ClubApiMapper mapper = new ClubApiMapper();

    /**
     * Verifies that multipart data is copied into a framework-independent command.
     */
    @DisplayName("maps multipart input without leaking the framework type")
    @Test
    void mapsTheApiBoundaryWithoutLeakingMultipartIntoTheApplication() throws Exception {
        CreateClubInternalRequest request = new CreateClubInternalRequest("club-1", "RAW", "Club")
            .address("Address")
            .city("Paris")
            .postalCode("75001")
            .email("mail")
            .phoneNumber("phone")
            .website("website")
            .logoUrl("logo");
        MockMultipartFile image = new MockMultipartFile(
            "image", "club.png", "image/png", new byte[]{1, 2, 3});

        CreateClubCommand command = mapper.toCommand(request, image);

        assertThat(command.address()).isEqualTo("Address");
        assertThat(command.image().filename()).isEqualTo("club.png");
        assertThat(command.image().content()).containsExactly(1, 2, 3);
    }

    /**
     * Verifies that every authoritative Club field reaches the internal response.
     */
    @DisplayName("maps every Club view field to the internal response")
    @Test
    void mapsEveryClubViewFieldToTheInternalResponse() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 19, 12, 0);
        ClubView view = new ClubView(
            "club-1", "RAW", "Club", "Address", "Paris", "75001",
            "mail", "phone", "website", "logo", true, 48.0, 2.0, now, now);

        var response = mapper.toInternalResponse(view);

        assertThat(response.getId()).isEqualTo(view.id());
        assertThat(response.getRawName()).isEqualTo(view.rawName());
        assertThat(response.getName()).isEqualTo(view.name());
        assertThat(response.getAddress()).isEqualTo(view.address());
        assertThat(response.getCity()).isEqualTo(view.city());
        assertThat(response.getPostalCode()).isEqualTo(view.postalCode());
        assertThat(response.getEmail()).isEqualTo(view.email());
        assertThat(response.getPhoneNumber()).isEqualTo(view.phoneNumber());
        assertThat(response.getWebsite()).isEqualTo(view.website());
        assertThat(response.getLogoUrl()).isEqualTo(view.logoUrl());
        assertThat(response.getActive()).isEqualTo(view.active());
        assertThat(response.getLatitude()).isEqualTo(view.latitude());
        assertThat(response.getLongitude()).isEqualTo(view.longitude());
        assertThat(response.getCreatedAt()).isEqualTo(view.createdAt());
        assertThat(response.getLastUpdate()).isEqualTo(view.lastUpdate());
    }
}
