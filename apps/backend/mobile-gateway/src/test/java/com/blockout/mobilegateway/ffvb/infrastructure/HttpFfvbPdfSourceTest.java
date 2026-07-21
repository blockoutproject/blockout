package com.blockout.mobilegateway.ffvb.infrastructure;

import com.blockout.mobilegateway.ffvb.application.FfvbPdfDownload;
import com.blockout.mobilegateway.ffvb.application.PdfLinkTokenService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class HttpFfvbPdfSourceTest {

    private final RestTemplate restTemplate = mock(RestTemplate.class);
    private final HttpFfvbPdfSource pdfSource = new HttpFfvbPdfSource(restTemplate);

    @Test
    void downloadsLnvSheetsFromTheExistingGenderSpecificPath() {
        byte[] pdf = new byte[]{1};
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(byte[].class)))
            .thenReturn(ResponseEntity.ok(pdf));

        FfvbPdfDownload result = pdfSource.downloadSheet(
            new PdfLinkTokenService.Payload("sheet", "2026", "AALNV", "SPS123"));

        ArgumentCaptor<String> url = ArgumentCaptor.forClass(String.class);
        verify(restTemplate).exchange(url.capture(), eq(HttpMethod.GET), any(HttpEntity.class), eq(byte[].class));
        assertThat(url.getValue()).isEqualTo("https://www.lnv.fr/pdf/2025/DataVolley/Women/SPS123-2027.pdf");
        assertThat(result.content()).containsExactly(pdf);
        assertThat(result.transportError()).isFalse();
    }

    @Test
    void postsTheExistingFfvbAddressForm() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(byte[].class)))
            .thenReturn(ResponseEntity.ok(new byte[]{2}));

        pdfSource.downloadAddress(new PdfLinkTokenService.Payload("address", "2026", "LNV", "M1"));

        @SuppressWarnings("rawtypes")
        ArgumentCaptor<HttpEntity> request = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(
            eq("https://www.ffvbbeach.org/ffvbapp/adressier/fiche_match_ffvb.php"),
            eq(HttpMethod.POST),
            request.capture(),
            eq(byte[].class));
        assertThat(request.getValue().getBody()).isInstanceOf(MultiValueMap.class);
        @SuppressWarnings("unchecked")
        MultiValueMap<String, String> form = (MultiValueMap<String, String>) request.getValue().getBody();
        assertThat(form.getFirst("wss_saison")).isEqualTo("2026");
        assertThat(form.getFirst("codent")).isEqualTo("LNV");
        assertThat(form.getFirst("codmatch")).isEqualTo("M1");
    }

    @Test
    void exposesProviderHttpFailuresAsTransportErrors() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(byte[].class)))
            .thenThrow(new HttpServerErrorException(HttpStatus.SERVICE_UNAVAILABLE));

        FfvbPdfDownload result = pdfSource.downloadSheet(
            new PdfLinkTokenService.Payload("sheet", "2026", "LNV", "M1"));

        assertThat(result.statusCode()).isEqualTo(503);
        assertThat(result.content()).isNull();
        assertThat(result.transportError()).isTrue();
    }
}
