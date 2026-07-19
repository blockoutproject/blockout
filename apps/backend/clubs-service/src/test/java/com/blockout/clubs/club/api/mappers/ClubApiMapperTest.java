package com.blockout.clubs.club.api.mappers;

import com.blockout.clubs.club.api.models.CreateClubInternalRequest;
import com.blockout.clubs.club.application.commands.CreateClubCommand;
import com.blockout.clubs.club.application.views.ClubView;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class ClubApiMapperTest {

    private final ClubApiMapper mapper = new ClubApiMapper();

    @Test
    void mapsTheApiBoundaryWithoutLeakingMultipartIntoTheApplication() throws Exception {
        CreateClubInternalRequest request = new CreateClubInternalRequest(
                "club-1", "RAW", "Club", "Address", "Paris", "75001",
                "mail", "phone", "website", "logo");
        MockMultipartFile image = new MockMultipartFile(
                "image", "club.png", "image/png", new byte[]{1, 2, 3});

        CreateClubCommand command = mapper.toCommand(request, image);

        assertThat(command.address()).isEqualTo("Address");
        assertThat(command.image().filename()).isEqualTo("club.png");
        assertThat(command.image().content()).containsExactly(1, 2, 3);
    }

    @Test
    void mapsEveryClubViewFieldToTheInternalResponse() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 19, 12, 0);
        ClubView view = new ClubView(
                "club-1", "RAW", "Club", "Address", "Paris", "75001",
                "mail", "phone", "website", "logo", true, 48.0, 2.0, now, now);

        var response = mapper.toDto(view);

        assertThat(response).usingRecursiveComparison().isEqualTo(view);
    }
}
