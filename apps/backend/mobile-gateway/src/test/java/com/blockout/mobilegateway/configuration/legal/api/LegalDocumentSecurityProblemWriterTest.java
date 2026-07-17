package com.blockout.mobilegateway.configuration.legal.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;

class LegalDocumentSecurityProblemWriterTest {

    @Test
    void v2AuthenticationFailureUsesCamelCaseProblemDetails() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        var writer = new LegalDocumentSecurityProblemWriter(
                objectMapper,
                new LegalDocumentProblemFactory());
        var request = new MockHttpServletRequest("PUT", "/api/v2/mobile/secure/config/legal/privacy");
        request.addHeader(LegalDocumentProblemFactory.REQUEST_ID_HEADER, "request-1");
        var response = new MockHttpServletResponse();

        writer.commence(request, response, new BadCredentialsException("invalid"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).isEqualTo("application/problem+json");
        assertThat(response.getContentAsString()).contains("\"code\":\"unauthorized\"");
        assertThat(response.getContentAsString()).contains("\"requestId\":\"request-1\"");
        assertThat(response.getContentAsString()).doesNotContain("request_id");
    }
}
