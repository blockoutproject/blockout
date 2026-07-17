package com.blockout.mobilegateway.shared.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

class MobileGatewayV2ExceptionHandlerTest {

    private final MobileGatewayV2ExceptionHandler handler =
            new MobileGatewayV2ExceptionHandler(new MobileGatewayProblemFactory(), new ObjectMapper());

    @Test
    void mapsBindingFailuresToBadRequestProblemDetails() {
        var request = new MockHttpServletRequest("GET", "/api/v2/mobile/public/search/clubs");

        var response = handler.invalidRequest(new ServletRequestBindingException("missing"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getCode()).isEqualTo("invalid_request");
    }

    @Test
    void mapsMultipartLimitsToPayloadTooLargeProblemDetails() {
        var request = new MockHttpServletRequest("POST", "/api/v2/mobile/public/reports");

        var response = handler.payloadTooLarge(new MaxUploadSizeExceededException(5), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(response.getBody().getCode()).isEqualTo("payload_too_large");
    }

    @Test
    void preservesSafeDownstreamProblemAndRebindsItsInstance() {
        var request = new MockHttpServletRequest("GET", "/api/v2/mobile/public/search/clubs");
        var exception = HttpClientErrorException.create(
                HttpStatus.NOT_FOUND,
                "Not Found",
                HttpHeaders.EMPTY,
                ("{\"title\":\"Not Found\",\"status\":404,\"code\":\"club_not_found\","
                        + "\"detail\":\"The club does not exist.\",\"requestId\":\"downstream-343\"}")
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8),
                java.nio.charset.StandardCharsets.UTF_8);

        var response = handler.downstreamProblem(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().getCode()).isEqualTo("club_not_found");
        assertThat(response.getBody().getRequestId()).isEqualTo("downstream-343");
        assertThat(response.getBody().getInstance()).isEqualTo("/api/v2/mobile/public/search/clubs");
    }
}
