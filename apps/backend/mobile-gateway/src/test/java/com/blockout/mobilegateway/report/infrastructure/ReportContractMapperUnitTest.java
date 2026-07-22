package com.blockout.mobilegateway.report.infrastructure;

import com.blockout.mobilegateway.report.application.commands.CreateReportCommand;
import com.blockout.mobilegateway.report.infrastructure.contract.models.ReportInternalResponse;
import com.blockout.mobilegateway.shared.application.models.ReportType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReportContractMapperUnitTest {

    private final ReportContractMapper mapper = new ReportContractMapper();

    @Test
    void mapsTheCompletePublicCreationRequest() {
        CreateReportCommand request = new CreateReportCommand(
            ReportType.DATA_ERROR, "Broken score", "Description", "1.0", "user-1", "User",
            "Match", "iPhone", "iOS", List.of("https://images.invalid/1"));

        var internal = mapper.toInternalRequest(request);

        assertThat(internal.getType().name()).isEqualTo("DATA_ERROR");
        assertThat(internal.getTitle()).isEqualTo("Broken score");
        assertThat(internal.getAttachmentImageUrls()).containsExactly("https://images.invalid/1");
    }

    @Test
    void mapsTheCompleteInternalResult() {
        var response = mapper.toResponse(new ReportInternalResponse(
            1L, 2, "https://github.invalid/issues/2", "Broken score", "OPEN"));

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.number()).isEqualTo(2);
        assertThat(response.htmlUrl()).isEqualTo("https://github.invalid/issues/2");
        assertThat(response.state()).isEqualTo("OPEN");
    }
}
