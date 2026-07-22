package com.blockout.mobilegateway.ffvb.api;

import com.blockout.mobilegateway.ffvb.application.FfvbPdfApplicationService;
import com.blockout.mobilegateway.ffvb.application.FfvbPdfDownload;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FfvbPublicControllerUnitTest {

    private final FfvbPdfApplicationService pdfService = mock(FfvbPdfApplicationService.class);
    private final FfvbPublicController controller = new FfvbPublicController(pdfService);

    @Test
    void streamsSuccessfulDownloadsWithTheExistingMobileHeaders() throws Exception {
        byte[] pdf = new byte[]{1, 2, 3};
        when(pdfService.download("signed-token")).thenReturn(new FfvbPdfDownload(200, pdf, false));
        var response = controller.proxySignedFfvbPdf("signed-token");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("application/pdf");
        assertThat(response.getHeaders().getFirst("Content-Disposition"))
            .isEqualTo("inline; filename=\"document.pdf\"");
        assertThat(response.getHeaders().getFirst("Cache-Control")).isEqualTo("private, no-store");
        assertThat(response.getBody().getContentAsByteArray()).containsExactly(pdf);
    }

    @Test
    void returnsUnauthorizedForInvalidOrExpiredLinks() throws Exception {
        when(pdfService.download("invalid-token")).thenThrow(new JwtException("expired"));
        var response = controller.proxySignedFfvbPdf("invalid-token");

        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void mapsProviderHttpFailuresToBadGateway() throws Exception {
        when(pdfService.download("signed-token")).thenReturn(new FfvbPdfDownload(503, null, true));
        var response = controller.proxySignedFfvbPdf("signed-token");

        assertThat(response.getStatusCode().value()).isEqualTo(502);
    }
}
