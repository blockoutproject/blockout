package com.blockout.mobilegateway.report.infrastructure;

import com.blockout.mobilegateway.report.api.models.CreateReportRequest;
import com.blockout.mobilegateway.report.infrastructure.contract.models.ReportInternalResponse;
import com.blockout.mobilegateway.shared.application.models.ReportType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReportContractMapperUnitTest {

    private final ReportContractMapper mapper = new ReportContractMapper();

    @Test
    void mapsTheCompletePublicCreationRequest() {
        CreateReportRequest request = CreateReportRequest.builder()
            .type(ReportType.DATA_ERROR)
            .title("Broken score")
            .description("Description")
            .appVersion("1.0")
            .userId("user-1")
            .userName("User")
            .screen("Match")
            .deviceModel("iPhone")
            .os("iOS")
            .attachmentImageUrls(List.of("https://images.invalid/1"))
            .build();

        var internal = mapper.toInternalRequest(request);

        assertThat(internal.getType().name()).isEqualTo("DATA_ERROR");
        assertThat(internal.getTitle()).isEqualTo("Broken score");
        assertThat(internal.getAttachmentImageUrls()).containsExactly("https://images.invalid/1");
    }

    @Test
    void mapsTheCompleteInternalResult() {
        var response = mapper.toResponse(new ReportInternalResponse(
            1L, 2, "https://github.invalid/issues/2", "Broken score", "OPEN"));

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getNumber()).isEqualTo(2);
        assertThat(response.getHtmlUrl()).isEqualTo("https://github.invalid/issues/2");
        assertThat(response.getState()).isEqualTo("OPEN");
    }
}
