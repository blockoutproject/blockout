package com.blockout.reports.report.api.v1;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.shared.model.ReportTypeEnum;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Verifies the isolated v1 request and response casing. */
@DisplayName("Legacy reports JSON")
class LegacyReportsJsonUnitTest {

    private final LegacyReportsJson json = new LegacyReportsJson(new ObjectMapper().findAndRegisterModules());

    /** Proves the retained request accepts snake-case context and arbitrary user text. */
    @Test
    @DisplayName("reads the retained snake-case command")
    void readsRetainedSnakeCaseCommand() throws Exception {
        LegacyReportRequest request = json.read("""
                {"type":"LIVE","title":"Stream","description":"Broken","app_version":"1.2.3",
                 "user_id":"auth0|legacy","user_name":"Player","screen":"Match",
                 "device_model":"Phone","os":"Android","attachment_image_urls":["https://legacy/image.png"]}
                """);

        assertThat(request.type()).isEqualTo(ReportTypeEnum.LIVE);
        assertThat(request.appVersion()).isEqualTo("1.2.3");
        assertThat(request.userId()).isEqualTo("auth0|legacy");
        assertThat(request.attachmentImageUrls()).containsExactly("https://legacy/image.png");
    }

    /** Proves provider ID/state and html_url remain in the exact v1 response. */
    @Test
    @DisplayName("writes the retained provider-shaped response")
    void writesRetainedProviderShapedResponse() throws Exception {
        String response = json.write(new LegacyReportResponse(
                99L, 42, "https://github.example/issues/42", "Stream", "OPEN"));

        assertThat(response).isEqualTo(
                "{\"id\":99,\"number\":42,\"html_url\":\"https://github.example/issues/42\","
                        + "\"title\":\"Stream\",\"state\":\"OPEN\"}");
    }
}
