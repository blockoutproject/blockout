package com.blockout.reports.report.api;

import com.blockout.reports.report.api.models.CreateReportInternalRequest;
import com.blockout.reports.report.api.models.ReportInternalResponse;
import com.blockout.shared.model.ReportTypeEnum;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReportApiContractUnitTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void exposesTheCompleteReportResultWithoutLeakingProviderTypes() throws Exception {
        ReportInternalResponse response = new ReportInternalResponse(
            1L, 2, "https://github.invalid/issues/2", "Broken score", "OPEN");

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsBytes(response));
        assertThat(json.path("htmlUrl").asText()).isEqualTo("https://github.invalid/issues/2");
        assertThat(json.has("html_url")).isFalse();
    }

    @Test
    void keepsCreationInputSeparateFromTheResult() {
        CreateReportInternalRequest request = new CreateReportInternalRequest(
            ReportTypeEnum.DATA_ERROR, "Broken score")
            .description("Description")
            .appVersion("1.0")
            .userId("user-1")
            .userName("User")
            .screen("Match")
            .deviceModel("iPhone")
            .os("iOS");

        JsonNode json = objectMapper.valueToTree(request);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
            "type", "title", "description", "appVersion", "userId", "userName", "screen",
            "deviceModel", "os", "attachmentImageUrls");
        assertThat(json.has("number")).isFalse();
    }
}
