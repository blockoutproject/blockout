package com.blockout.mobilegateway.config.infrastructure;

import com.blockout.mobilegateway.config.api.models.RawDivisionMappingResponse;
import com.blockout.mobilegateway.config.api.models.UpsertDivisionRequest;
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

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getLogoUrl()).isEqualTo("logo");

        var request = new UpsertDivisionRequest("National", "#1", "#2", "#3", "#4");
        assertThat(mapper.toCreateRequest(request).getMainColor()).isEqualTo("#1");
        assertThat(mapper.toUpdateRequest(request).getThirdGradientColor()).isEqualTo("#4");
    }

    @Test
    void mapsSharedGeneratedEnumsWithoutLeakingThemToTheGatewayBoundary() {
        RawDivisionMappingResponse response = mapper.toResponse(
            new RawDivisionMappingInternalResponse(1L, "N3", "LNV", "2026/2027", true)
                .divisionId(7L)
                .format(FormatEnum.SIX)
                .gender(GenderEnum.F));

        assertThat(response.getFormat().name()).isEqualTo("SIX");
        assertThat(response.getGender().name()).isEqualTo("F");
        assertThat(mapper.toCreateRequest(response).getFormat()).isEqualTo(FormatEnum.SIX);
    }
}
