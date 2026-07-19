package com.blockout.mobilegateway.ffvb.application;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FfvbPdfApplicationServiceTest {

    @Mock
    private PdfLinkTokenService tokenService;

    @Mock
    private FfvbPdfSource pdfSource;

    @InjectMocks
    private FfvbPdfApplicationService pdfService;

    @Test
    void routesSheetTokensToTheSheetSource() {
        PdfLinkTokenService.Payload payload = new PdfLinkTokenService.Payload("sheet", "2026", "LNV", "M1");
        FfvbPdfDownload expected = new FfvbPdfDownload(200, new byte[] { 1, 2 }, false);
        when(tokenService.validate("signed-token")).thenReturn(payload);
        when(pdfSource.downloadSheet(payload)).thenReturn(expected);

        FfvbPdfDownload result = pdfService.download("signed-token");

        assertThat(result).isSameAs(expected);
        verify(pdfSource).downloadSheet(payload);
    }

    @Test
    void routesAddressTokensToTheAddressSource() {
        PdfLinkTokenService.Payload payload = new PdfLinkTokenService.Payload("address", "2026", "LNV", "M1");
        FfvbPdfDownload expected = new FfvbPdfDownload(200, new byte[] { 3 }, false);
        when(tokenService.validate("signed-token")).thenReturn(payload);
        when(pdfSource.downloadAddress(payload)).thenReturn(expected);

        assertThat(pdfService.download("signed-token")).isSameAs(expected);
        verify(pdfSource).downloadAddress(payload);
    }

    @Test
    void rejectsUnsupportedProviderKindsBeforeCallingTheSource() {
        PdfLinkTokenService.Payload payload = new PdfLinkTokenService.Payload("unknown", "2026", "LNV", "M1");
        when(tokenService.validate("signed-token")).thenReturn(payload);

        assertThatThrownBy(() -> pdfService.download("signed-token"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid PDF kind");
        verifyNoInteractions(pdfSource);
    }
}
