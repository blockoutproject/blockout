package com.blockout.mobilegateway.ffvb.infrastructure;

import com.blockout.mobilegateway.ffvb.application.FfvbPdfDownload;
import com.blockout.mobilegateway.ffvb.application.FfvbPdfSource;
import com.blockout.mobilegateway.ffvb.application.PdfLinkTokenService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
public class HttpFfvbPdfSource implements FfvbPdfSource {

    private static final Logger logger = LoggerFactory.getLogger(HttpFfvbPdfSource.class);
    private static final String USER_AGENT = "Blockout-MobileGateway/1.0";

    private final RestTemplate restTemplate;

    public HttpFfvbPdfSource(@Qualifier("externalRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public FfvbPdfDownload downloadSheet(PdfLinkTokenService.Payload payload) {
        String url;
        if ("AALNV".equals(payload.codent())) {
            String genderFolder = payload.codmatch().startsWith("SPS") ? "Women" : "Men";
            url = UriComponentsBuilder
                    .fromUriString(String.format(
                            "https://www.lnv.fr/pdf/2025/DataVolley/%s/%s-2027.pdf",
                            genderFolder,
                            payload.codmatch()))
                    .toUriString();
        } else {
            url = UriComponentsBuilder
                    .fromUriString("https://www.ffvbbeach.org/ffvbapp/resu/ffvolley_fdme.php")
                    .queryParam("saison", payload.saison())
                    .queryParam("codent", payload.codent())
                    .queryParam("codmatch", payload.codmatch())
                    .toUriString();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(MediaType.parseMediaTypes("application/pdf,*/*"));
        headers.set("User-Agent", USER_AGENT);
        return exchange(url, HttpMethod.GET, new HttpEntity<>(headers));
    }

    @Override
    public FfvbPdfDownload downloadAddress(PdfLinkTokenService.Payload payload) {
        String url = "https://www.ffvbbeach.org/ffvbapp/adressier/fiche_match_ffvb.php";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set("User-Agent", USER_AGENT);

        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("wss_saison", payload.saison());
        form.add("codmatch", payload.codmatch());
        form.add("codent", payload.codent());

        return exchange(url, HttpMethod.POST, new HttpEntity<>(form, headers));
    }

    private FfvbPdfDownload exchange(String url, HttpMethod method, HttpEntity<?> request) {
        logger.info("Calling FFVB PDF source", keyValue("method", method), keyValue("url", url));

        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(url, method, request, byte[].class);
            return new FfvbPdfDownload(response.getStatusCode().value(), response.getBody(), false);
        } catch (HttpStatusCodeException exception) {
            logger.error(
                    "FFVB PDF source returned an HTTP error",
                    keyValue("status", exception.getStatusCode().value()),
                    keyValue("body", exception.getResponseBodyAsString()),
                    exception);
            return new FfvbPdfDownload(exception.getStatusCode().value(), null, true);
        }
    }
}
