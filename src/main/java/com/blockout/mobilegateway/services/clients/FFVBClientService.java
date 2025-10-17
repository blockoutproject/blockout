package com.blockout.mobilegateway.services.clients;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
public class FFVBClientService {

    private static final Logger log = LoggerFactory.getLogger(FFVBClientService.class);

    private final RestTemplate restTemplate;

    public FFVBClientService(@Qualifier("externalRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * POST:
     * https://www.ffvbbeach.org/ffvbapp/resu/ffvolley_fdme.php?saison=2025/2026&codent=ABCCS&codmatch=2MA002
     * Corps: vide (POST requis)
     */
    public byte[] fetchMatchSheetPdf(String saison, String codent, String codmatch) {
        String url = UriComponentsBuilder
                .fromUriString("https://www.ffvbbeach.org/ffvbapp/resu/ffvolley_fdme.php")
                .queryParam("saison", saison)
                .queryParam("codent", codent)
                .queryParam("codmatch", codmatch)
                .build(true)
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        HttpEntity<String> req = new HttpEntity<>("", headers);

        try {
            log.info("FFVB sheet PDF", keyValue("url", url));
            ResponseEntity<byte[]> resp = restTemplate.exchange(url, HttpMethod.POST, req, byte[].class);
            ensurePdf(resp);
            return resp.getBody();
        } catch (HttpStatusCodeException e) {
            log.warn("FFVB sheet error", keyValue("status", e.getStatusCode()),
                    keyValue("body", e.getResponseBodyAsString()));
            throw e;
        } catch (Exception e) {
            log.error("FFVB sheet request failed", e);
            throw new RuntimeException("FFVB sheet request failed", e);
        }
    }

    /**
     * POST multipart:
     * https://www.ffvbbeach.org/ffvbapp/adressier/fiche_match_ffvb.php
     * form-data: wss_saison, codmatch, codent
     */
    public byte[] fetchMatchAddressPdf(String saison, String codent, String codmatch) {
        String url = "https://www.ffvbbeach.org/ffvbapp/adressier/fiche_match_ffvb.php";

        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("wss_saison", saison);
        form.add("codmatch", codmatch);
        form.add("codent", codent);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        HttpEntity<MultiValueMap<String, Object>> req = new HttpEntity<>(form, headers);

        try {
            log.info("FFVB address PDF", keyValue("url", url));
            ResponseEntity<byte[]> resp = restTemplate.exchange(url, HttpMethod.POST, req, byte[].class);
            ensurePdf(resp);
            return resp.getBody();
        } catch (HttpStatusCodeException e) {
            log.warn("FFVB address error", keyValue("status", e.getStatusCode()),
                    keyValue("body", e.getResponseBodyAsString()));
            throw e;
        } catch (Exception e) {
            log.error("FFVB address request failed", e);
            throw new RuntimeException("FFVB address request failed", e);
        }
    }

    private void ensurePdf(ResponseEntity<byte[]> resp) {
        if (!resp.getStatusCode().is2xxSuccessful())
            throw new RuntimeException("Upstream FFVB error: " + resp.getStatusCode());
        if (resp.getBody() == null || resp.getBody().length == 0)
            throw new RuntimeException("Empty PDF from FFVB");
    }
}