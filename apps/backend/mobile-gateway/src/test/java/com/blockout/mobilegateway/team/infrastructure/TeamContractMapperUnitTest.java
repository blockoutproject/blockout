package com.blockout.mobilegateway.team.infrastructure;

import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
import com.blockout.mobilegateway.team.application.commands.UpdateTeamCommand;
import com.blockout.mobilegateway.team.infrastructure.contract.models.TeamInternalResponse;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TeamContractMapperUnitTest {

    private final TeamContractMapper mapper = new TeamContractMapper();

    @Test
    void mapsTheGeneratedResponseToTheApplicationView() {
        var internal = new TeamInternalResponse(
            1L, "club-1", "RAW", "Team", "T", "LNV", 2L, "2026/2027",
            FormatEnum.SIX, GenderEnum.F, 3L, true).logoUrl("logo");

        var response = mapper.toResponse(internal);

        assertThat(response.getRawName()).isEqualTo("RAW");
        assertThat(response.getFormat()).isEqualTo(Format.SIX);
        assertThat(response.getGender()).isEqualTo(Gender.F);
        assertThat(response.getLogoUrl()).isEqualTo("logo");
    }

    @Test
    void mapsEveryExistingUpdateFieldToTheGeneratedRequest() {
        var request = UpdateTeamCommand.builder()
            .clubId("club-1")
            .rawName("RAW")
            .name("Team")
            .shortName("T")
            .leagueCode("LNV")
            .divisionId(2L)
            .logoUrl("logo")
            .season("2026/2027")
            .format(Format.SIX)
            .gender(Gender.F)
            .active(true)
            .build();

        var internal = mapper.toInternalRequest(request);

        assertThat(internal.getClubId()).isEqualTo("club-1");
        assertThat(internal.getFormat()).isEqualTo(FormatEnum.SIX);
        assertThat(internal.getGender()).isEqualTo(GenderEnum.F);
        assertThat(internal.getActive()).isTrue();
    }
}
