package com.blockout.mobilegateway.match.outbound;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.match.application.MobileFederationDocumentException;
import com.blockout.mobilegateway.match.application.MobileFederationDocumentGateway;
import com.blockout.mobilegateway.services.PdfLinkTokenService;
import com.blockout.mobilegateway.shared.outbound.DownstreamClientSupport;
import io.jsonwebtoken.JwtException;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

/** Owns signed mobile PDF continuations and their external provider transport. */
@Component
public class GeneratedMobileFederationDocumentGateway implements MobileFederationDocumentGateway {

    private static final String PDF_PATH = "/api/v2/mobile/public/ffvb/pdf/";

    private final RestTemplate restTemplate;
    private final PdfLinkTokenService tokens;
    private final ApiClientProperties properties;

    /** Creates the adapter with the dedicated external provider transport. */
    public GeneratedMobileFederationDocumentGateway(
            @Qualifier("externalRestTemplate") RestTemplate restTemplate,
            PdfLinkTokenService tokens,
            ApiClientProperties properties) {
        this.restTemplate = restTemplate;
        this.tokens = tokens;
        this.properties = properties;
    }

    /** Signs the two canonical v2 continuation URLs for a match detail. */
    @Override
    public SignedDocuments sign(String season, String leagueCode, String matchCode) {
        requireSigningInput(season, "season");
        requireSigningInput(leagueCode, "leagueCode");
        requireSigningInput(matchCode, "matchCode");
        String root = DownstreamClientSupport.canonicalRoot(properties.getMobilegateway().getUrl());
        return new SignedDocuments(
                continuation(root, tokens.generate("address", season, leagueCode, matchCode)),
                continuation(root, tokens.generate("sheet", season, leagueCode, matchCode)));
    }

    /** Validates a continuation and proxies the matching federation PDF. */
    @Override
    public Document fetch(String token) {
        PdfLinkTokenService.Payload payload;
        try {
            payload = tokens.validate(token);
        } catch (JwtException exception) {
            throw new MobileFederationDocumentException(
                    HttpStatus.UNAUTHORIZED, "invalid_pdf_link", "The federation document link is invalid or expired.");
        }

        Request request = providerRequest(payload);
        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(
                    request.url(), request.method(), request.entity(), byte[].class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw unavailable();
            }
            return new Document(response.getBody());
        } catch (HttpStatusCodeException exception) {
            throw unavailable();
        }
    }

    private static Request providerRequest(PdfLinkTokenService.Payload payload) {
        HttpHeaders headers = new HttpHeaders();
        if ("sheet".equals(payload.kind())) {
            headers.setAccept(List.of(MediaType.APPLICATION_PDF, MediaType.ALL));
            String url;
            if ("AALNV".equals(payload.codent())) {
                String genderFolder = payload.codmatch().startsWith("SPS") ? "Women" : "Men";
                url = "https://www.lnv.fr/pdf/2025/DataVolley/" + genderFolder + "/"
                        + payload.codmatch() + "-2027.pdf";
            } else {
                url = UriComponentsBuilder
                        .fromUriString("https://www.ffvbbeach.org/ffvbapp/resu/ffvolley_fdme.php")
                        .queryParam("saison", payload.saison())
                        .queryParam("codent", payload.codent())
                        .queryParam("codmatch", payload.codmatch())
                        .toUriString();
            }
            return new Request(url, HttpMethod.GET, new HttpEntity<>(headers));
        }
        if ("address".equals(payload.kind())) {
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("wss_saison", payload.saison());
            form.add("codmatch", payload.codmatch());
            form.add("codent", payload.codent());
            return new Request(
                    "https://www.ffvbbeach.org/ffvbapp/adressier/fiche_match_ffvb.php",
                    HttpMethod.POST,
                    new HttpEntity<>(form, headers));
        }
        throw new MobileFederationDocumentException(
                HttpStatus.BAD_REQUEST, "invalid_pdf_kind", "The federation document kind is invalid.");
    }

    private static String continuation(String root, String token) {
        return UriComponentsBuilder.fromUriString(root).path(PDF_PATH).path(token).toUriString();
    }

    private static void requireSigningInput(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing federation document signing input: " + name);
        }
    }

    private static MobileFederationDocumentException unavailable() {
        return new MobileFederationDocumentException(
                HttpStatus.BAD_GATEWAY,
                "federation_document_unavailable",
                "The federation document provider could not complete the request.");
    }

    private record Request(String url, HttpMethod method, HttpEntity<?> entity) {
    }
}
