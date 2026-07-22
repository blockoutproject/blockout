package com.blockout.mobilegateway.config.infrastructure;

import com.blockout.mobilegateway.config.application.commands.CreateRawDivisionMappingCommand;
import com.blockout.mobilegateway.config.application.commands.UpsertDivisionCommand;
import com.blockout.mobilegateway.config.application.views.RawDivisionMappingView;
import com.blockout.mobilegateway.config.infrastructure.contract.models.DivisionInternalResponse;
import com.blockout.mobilegateway.config.infrastructure.contract.models.RawDivisionMappingInternalResponse;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ConfigContractMapperUnitTest {

    private final ConfigContractMapper mapper = new ConfigContractMapper();

    @Test
    void mapsGeneratedDivisionModelsAtTheAdapterBoundary() {
        var response = mapper.toResponse(
            new DivisionInternalResponse(1L, "National", "#1", "#2", "#3", "#4", true)
                .logoUrl("logo"));

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.logoUrl()).isEqualTo("logo");

        var request = new UpsertDivisionCommand("National", "#1", "#2", "#3", "#4");
        assertThat(mapper.toCreateRequest(request).getMainColor()).isEqualTo("#1");
        assertThat(mapper.toUpdateRequest(request).getThirdGradientColor()).isEqualTo("#4");
    }

    @Test
    void mapsSharedGeneratedEnumsWithoutLeakingThemToTheGatewayBoundary() {
        RawDivisionMappingView response = mapper.toResponse(
            new RawDivisionMappingInternalResponse(1L, "N3", "LNV", "2026/2027", true)
                .divisionId(7L)
                .format(FormatEnum.SIX)
                .gender(GenderEnum.F));

        assertThat(response.format().name()).isEqualTo("SIX");
        assertThat(response.gender().name()).isEqualTo("F");
        var command = new CreateRawDivisionMappingCommand(
            response.rawDivisionName(), response.divisionId(), response.format(), response.gender(),
            response.leagueCode(), response.season());
        assertThat(mapper.toCreateRequest(command).getFormat()).isEqualTo(FormatEnum.SIX);
    }
}
