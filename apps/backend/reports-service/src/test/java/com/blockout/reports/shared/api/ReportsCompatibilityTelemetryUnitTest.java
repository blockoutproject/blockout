package com.blockout.reports.shared.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.reports.shared.api.v2.ReportsProblemFactory;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Verifies reports compatibility telemetry routing without inspecting payloads. */
@DisplayName("Reports compatibility telemetry")
class ReportsCompatibilityTelemetryUnitTest {

    private final ReportsCompatibilityTelemetry telemetry = new ReportsCompatibilityTelemetry();

    /** Proves only the exact v1 and v2 report operation is observed. */
    @Test
    @DisplayName("filters only the report coexistence routes")
    void filtersOnlyReportCoexistenceRoutes() {
        assertThat(telemetry.shouldNotFilter(request("/api/v1/reports"))).isFalse();
        assertThat(telemetry.shouldNotFilter(request("/api/v2/reports"))).isFalse();
        assertThat(telemetry.shouldNotFilter(request("/api/v2/reports/unknown"))).isTrue();
        assertThat(telemetry.shouldNotFilter(request("/actuator/health"))).isTrue();
    }

    /** Proves the filter assigns one reusable safe request identifier before delegation. */
    @Test
    @DisplayName("assigns the request identifier before delegation")
    void assignsRequestIdentifierBeforeDelegation() throws Exception {
        MockHttpServletRequest request = request("/api/v2/reports");
        request.addHeader(ReportsProblemFactory.REQUEST_ID_HEADER, "report-request-1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = (filteredRequest, filteredResponse) ->
                assertThat(filteredRequest.getAttribute(ReportsProblemFactory.REQUEST_ID_ATTRIBUTE))
                        .isEqualTo("report-request-1");

        telemetry.doFilterInternal(request, response, chain);

        assertThat(request.getAttribute(ReportsProblemFactory.REQUEST_ID_ATTRIBUTE))
                .isEqualTo("report-request-1");
    }

    /** Builds one mock POST request for the selected path. */
    private MockHttpServletRequest request(String path) {
        return new MockHttpServletRequest("POST", path);
    }
}
