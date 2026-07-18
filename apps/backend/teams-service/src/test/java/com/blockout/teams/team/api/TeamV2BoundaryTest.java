package com.blockout.teams.team.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.teams.generated.api.TeamClubDiscoveryApi;
import com.blockout.teams.generated.api.TeamFollowersApi;
import com.blockout.teams.generated.api.TeamsApi;
import com.blockout.teams.generated.model.TeamInternalResponse;
import com.blockout.teams.generated.model.UpdateTeamInternalRequest;
import com.blockout.teams.team.api.v2.TeamApiMapper;
import com.blockout.teams.team.api.v2.TeamClubDiscoveryV2Controller;
import com.blockout.teams.team.api.v2.TeamFollowersV2Controller;
import com.blockout.teams.team.api.v2.TeamV2Controller;
import com.blockout.teams.team.application.TeamView;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.mock.web.MockMultipartFile;

class TeamV2BoundaryTest {

    @Test
    void controllersImplementEveryGeneratedTeamBoundary() {
        assertThat(TeamsApi.class).isAssignableFrom(TeamV2Controller.class);
        assertThat(TeamClubDiscoveryApi.class).isAssignableFrom(TeamClubDiscoveryV2Controller.class);
        assertThat(TeamFollowersApi.class).isAssignableFrom(TeamFollowersV2Controller.class);
    }

    @Test
    void generatedResponseUsesCanonicalCamelCaseWithTheDefaultMapper() throws Exception {
        TeamApiMapper mapper = Mappers.getMapper(TeamApiMapper.class);
        TeamInternalResponse response = mapper.toResponse(new TeamView(
                1L, "club-1", "Raw", "Team", "TM", "L1", 2L, "2026", FormatEnum.SIX,
                GenderEnum.M, 3L, "https://logo", true, LocalDateTime.now(), LocalDateTime.now()));
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

        String body = objectMapper.writeValueAsString(response);

        assertThat(body).contains("\"clubId\"", "\"shortName\"", "\"followersCount\"", "\"logoUrl\"");
        assertThat(body).doesNotContain("club_id", "short_name", "followers_count", "createdAt", "lastUpdate");
    }

    @Test
    void canonicalUpdateRejectsConflictingLogoIntents() {
        TeamV2Controller controller = new TeamV2Controller(null, null, Mappers.getMapper(TeamApiMapper.class));
        UpdateTeamInternalRequest request = new UpdateTeamInternalRequest(true);
        MockMultipartFile image = new MockMultipartFile("image", "logo.png", "image/png", new byte[]{1});

        assertThatThrownBy(() -> controller.updateTeam(1L, request, image))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("removeLogo");
    }
}
