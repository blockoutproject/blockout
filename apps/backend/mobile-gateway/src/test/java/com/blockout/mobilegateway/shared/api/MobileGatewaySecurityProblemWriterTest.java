package com.blockout.mobilegateway.shared.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;

class MobileGatewaySecurityProblemWriterTest {

    @Test
    void canonicalAuthenticationFailureUsesCamelCaseProblemDetails() throws Exception {
        var writer = new MobileGatewaySecurityProblemWriter(new ObjectMapper(), new MobileGatewayProblemFactory());
        var request = new MockHttpServletRequest("GET", "/api/v2/mobile/secure/notifications");
        request.addHeader(MobileGatewayProblemFactory.REQUEST_ID_HEADER, "request-343");
        var response = new MockHttpServletResponse();

        writer.commence(request, response, new BadCredentialsException("invalid"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).isEqualTo("application/problem+json");
        assertThat(response.getContentAsString()).contains("\"code\":\"unauthorized\"");
        assertThat(response.getContentAsString()).contains("\"requestId\":\"request-343\"");
        assertThat(response.getContentAsString()).doesNotContain("request_id");
    }
}
