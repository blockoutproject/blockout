package com.blockout.mobilegateway.configuration.legal.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.client.HttpServerErrorException;

class LegalDocumentV2ExceptionHandlerTest {

    @Test
    void preservesSafeDownstreamProblemDetailsAndRebindsInstance() {
        ObjectMapper objectMapper = new ObjectMapper();
        var handler = new LegalDocumentV2ExceptionHandler(new LegalDocumentProblemFactory(), objectMapper);
        var request = new MockHttpServletRequest("PUT", "/api/v2/mobile/secure/config/legal/privacy");
        var exception = HttpServerErrorException.create(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                HttpHeaders.EMPTY,
                "{\"title\":\"Internal Server Error\",\"status\":500,\"code\":\"legal_document_not_found\","
                        .concat("\"detail\":\"The legal document could not be found.\",\"requestId\":\"downstream-1\"}")
                        .getBytes(StandardCharsets.UTF_8),
                StandardCharsets.UTF_8);

        var response = handler.downstreamProblem(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().getCode()).isEqualTo("legal_document_not_found");
        assertThat(response.getBody().getRequestId()).isEqualTo("downstream-1");
        assertThat(response.getBody().getInstance()).isEqualTo(request.getRequestURI());
    }
}
