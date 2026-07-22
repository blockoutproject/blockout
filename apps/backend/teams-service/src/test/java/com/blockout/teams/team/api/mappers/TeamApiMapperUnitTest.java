package com.blockout.teams.team.api.mappers;

import com.blockout.teams.team.api.models.UpdateTeamInternalRequest;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;
import com.blockout.teams.team.application.views.TeamView;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies the explicit Team transport-to-application mapping boundary.
 */
@DisplayName("Team API mapper")
class TeamApiMapperUnitTest {

    private final TeamApiMapper mapper = new TeamApiMapper();

    @Test
    @DisplayName("copies multipart bytes into an application command")
    void copiesMultipartBytesIntoAnApplicationCommand() throws Exception {
        UpdateTeamInternalRequest request = new UpdateTeamInternalRequest().name("Team");
        MockMultipartFile image = new MockMultipartFile("image", "team.png", "image/png", new byte[]{1, 2});

        var command = mapper.toCommand(request, image);

        assertThat(command.name()).isEqualTo("Team");
        assertThat(command.image().filename()).isEqualTo("team.png");
        assertThat(command.image().content()).containsExactly(1, 2);
    }

    @Test
    @DisplayName("maps every Team view field to the response")
    void mapsEveryTeamViewFieldToTheResponse() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 19, 12, 0);
        TeamView view = new TeamView(1L, "club-1", "RAW", "Team", "BO", "LNV", 2L,
            "2026/2027", Format.SIX, Gender.F, 3L, "logo", true, now, now);

        var response = mapper.toInternalResponse(view);

        assertThat(response.getId()).isEqualTo(view.id());
        assertThat(response.getClubId()).isEqualTo(view.clubId());
        assertThat(response.getRawName()).isEqualTo(view.rawName());
        assertThat(response.getName()).isEqualTo(view.name());
        assertThat(response.getShortName()).isEqualTo(view.shortName());
        assertThat(response.getLeagueCode()).isEqualTo(view.leagueCode());
        assertThat(response.getDivisionId()).isEqualTo(view.divisionId());
        assertThat(response.getSeason()).isEqualTo(view.season());
        assertThat(response.getFormat()).isEqualTo(FormatEnum.SIX);
        assertThat(response.getGender()).isEqualTo(GenderEnum.F);
        assertThat(response.getFollowersCount()).isEqualTo(view.followersCount());
        assertThat(response.getLogoUrl()).isEqualTo(view.logoUrl());
        assertThat(response.getActive()).isEqualTo(view.active());
        assertThat(response.getCreatedAt()).isEqualTo(view.createdAt());
        assertThat(response.getLastUpdate()).isEqualTo(view.lastUpdate());
    }
}
