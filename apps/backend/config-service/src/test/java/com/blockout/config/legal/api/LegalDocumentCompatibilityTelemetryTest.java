package com.blockout.config.legal.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.config.legal.api.v2.LegalDocumentProblemFactory;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class LegalDocumentCompatibilityTelemetryTest {

    @Test
    void assignsTheSafeRequestIdentifierUsedByTheV2ProblemBoundary() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v2/config/legal/privacy");
        request.addHeader(LegalDocumentProblemFactory.REQUEST_ID_HEADER, "request-123");
        MockHttpServletResponse response = new MockHttpServletResponse();

        new LegalDocumentCompatibilityTelemetry()
                .doFilter(request, response, new MockFilterChain());

        assertThat(request.getAttribute(LegalDocumentProblemFactory.REQUEST_ID_ATTRIBUTE))
                .isEqualTo("request-123");
    }
}
