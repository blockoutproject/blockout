package com.blockout.mobilegateway.ffvb.api;

import com.blockout.mobilegateway.ffvb.application.FfvbPdfApplicationService;
import com.blockout.mobilegateway.ffvb.application.FfvbPdfDownload;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FfvbPublicControllerTest {

    private final FfvbPdfApplicationService pdfService = mock(FfvbPdfApplicationService.class);
    private final FfvbPublicController controller = new FfvbPublicController(pdfService);

    @Test
    void streamsSuccessfulDownloadsWithTheExistingMobileHeaders() throws Exception {
        byte[] pdf = new byte[]{1, 2, 3};
        when(pdfService.download("signed-token")).thenReturn(new FfvbPdfDownload(200, pdf, false));
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.proxySigned("signed-token", response);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(response.getContentType()).isEqualTo("application/pdf");
        assertThat(response.getHeader("Content-Disposition")).isEqualTo("inline; filename=\"document.pdf\"");
        assertThat(response.getHeader("Cache-Control")).isEqualTo("private, no-store");
        assertThat(response.getContentAsByteArray()).containsExactly(pdf);
    }

    @Test
    void returnsUnauthorizedForInvalidOrExpiredLinks() throws Exception {
        when(pdfService.download("invalid-token")).thenThrow(new JwtException("expired"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.proxySigned("invalid-token", response);

        assertThat(response.getStatus()).isEqualTo(401);
    }

    @Test
    void mapsProviderHttpFailuresToBadGateway() throws Exception {
        when(pdfService.download("signed-token")).thenReturn(new FfvbPdfDownload(503, null, true));
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.proxySigned("signed-token", response);

        assertThat(response.getStatus()).isEqualTo(502);
    }
}
