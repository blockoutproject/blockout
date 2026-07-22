package com.blockout.mobilegateway.club.infrastructure;

import com.blockout.mobilegateway.club.application.commands.UpdateClubCommand;
import com.blockout.mobilegateway.club.infrastructure.contract.models.ClubInternalResponse;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ClubContractMapperUnitTest {

    private final ClubContractMapper mapper = new ClubContractMapper();

    @Test
    void mapsTheGeneratedInternalResponseToThePublicGatewayShape() {
        var internal = new ClubInternalResponse("club-1", "RAW", "Club", true)
            .address("1 Club Street")
            .city("Paris")
            .postalCode("75001")
            .logoUrl("logo.png")
            .latitude(48.0)
            .longitude(2.0);

        var response = mapper.toResponse(internal);

        assertThat(response.id()).isEqualTo("club-1");
        assertThat(response.rawName()).isEqualTo("RAW");
        assertThat(response.postalCode()).isEqualTo("75001");
        assertThat(response.logoUrl()).isEqualTo("logo.png");
        assertThat(response.active()).isTrue();
    }

    @Test
    void mapsThePublicUpdateToTheGeneratedInternalRequest() {
        var request = new UpdateClubCommand(
            "RAW", "Club", null, null, "75001", "logo.png", null, null, null);

        var internal = mapper.toInternalRequest(request);

        assertThat(internal.getRawName()).isEqualTo("RAW");
        assertThat(internal.getName()).isEqualTo("Club");
        assertThat(internal.getPostalCode()).isEqualTo("75001");
        assertThat(internal.getLogoUrl()).isEqualTo("logo.png");
    }
}
