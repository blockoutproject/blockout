package com.blockout.mobilegateway.pool.infrastructure;

import com.blockout.mobilegateway.pool.application.commands.UpdatePoolCommand;
import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PoolContractMapperUnitTest {
    private final PoolContractMapper mapper = new PoolContractMapper();

    @Test
    void mapsGeneratedResponseToGatewayModel() {
        var contract = new com.blockout.mobilegateway.pool.infrastructure.contract.models.PoolInternalResponse()
            .id(1L).poolCode("A").leagueCode("LNV").season("2026/2027").leagueName("League")
            .rawName("RAW").name("Pool").shortName("P").divisionId(2L)
            .format(com.blockout.shared.model.FormatEnum.SIX).gender(com.blockout.shared.model.GenderEnum.F)
            .followersCount(0L).active(true);

        var result = mapper.toResponse(contract);

        assertThat(result.getPoolCode()).isEqualTo("A");
        assertThat(result.getFormat()).isEqualTo(Format.SIX);
    }

    @Test
    void mapsEveryUpdateFieldToGeneratedRequest() {
        var request = UpdatePoolCommand.builder().poolCode("A").leagueCode("LNV").season("2026/2027")
            .leagueName("League").rawName("RAW").name("Pool").shortName("P").divisionId(2L)
            .format(Format.SIX).gender(Gender.F).active(true).build();

        var result = mapper.toInternalRequest(request);

        assertThat(result.getDivisionId()).isEqualTo(2L);
        assertThat(result.getGender()).isEqualTo(com.blockout.shared.model.GenderEnum.F);
    }
}
