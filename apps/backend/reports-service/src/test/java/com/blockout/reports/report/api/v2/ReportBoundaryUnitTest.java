package com.blockout.reports.report.api.v2;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.reports.generated.api.ReportsApi;
import com.blockout.reports.shared.api.v2.ReportsProblemFactory;
import com.blockout.reports.shared.api.v2.ReportsSecurityProblemWriter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;

/** Verifies generated boundary ownership and canonical security serialization. */
@DisplayName("Report boundary")
class ReportBoundaryUnitTest {

    /** Proves the canonical controller implements the generated reports interface. */
    @Test
    @DisplayName("implements the generated reports interface")
    void implementsGeneratedReportsInterface() {
        assertThat(ReportsApi.class).isAssignableFrom(ReportV2Controller.class);
    }

    /** Proves missing v2 authentication returns stable Problem Details. */
    @Test
    @DisplayName("returns canonical authentication Problem Details")
    void returnsCanonicalAuthenticationProblemDetails() throws Exception {
        ReportsSecurityProblemWriter writer = new ReportsSecurityProblemWriter(
                new ObjectMapper().findAndRegisterModules(), new ReportsProblemFactory());
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v2/reports");
        MockHttpServletResponse response = new MockHttpServletResponse();

        writer.commence(request, response, new BadCredentialsException("missing"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).isEqualTo("application/problem+json");
        assertThat(response.getContentAsString())
                .contains("\"code\":\"authentication_required\"")
                .contains("\"requestId\"");
    }
}
