package com.blockout.mobilegateway.controllers.v1;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.blockout.mobilegateway.services.PdfLinkTokenService;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@RestController
@RequestMapping("/api/v1/mobile/public/ffvb")
public class FfvbPdfProxyController {

    private static final Logger log = LoggerFactory.getLogger(FfvbPdfProxyController.class);

    private final RestTemplate restTemplate;
    private final PdfLinkTokenService tokenService;

    public FfvbPdfProxyController(
            @Qualifier("externalRestTemplate") RestTemplate restTemplate,
            PdfLinkTokenService tokenService) {
        this.restTemplate = restTemplate;
        this.tokenService = tokenService;
    }

    @GetMapping("/pdf/{token}")
    public void proxySigned(@PathVariable String token, HttpServletResponse resp) throws Exception {
        Instant start = Instant.now();
        PdfLinkTokenService.Payload p;
        try {
            p = tokenService.validate(token);
        } catch (JwtException e) {
            resp.sendError(401, "Invalid or expired link");
            return;
        }

        String url;
        HttpMethod method;
        HttpEntity<?> entity;

        if ("sheet".equals(p.kind())) {
            if ("AALNV".equals(p.leagueCode())) {
                String genderFolder = p.leagueCode().startsWith("SPS") ? "Women" : "Men";

                url = UriComponentsBuilder
                        .fromUriString(String.format(
                                "https://www.lnv.fr/pdf/2025/DataVolley/%s/%s-2026.php",
                                genderFolder,
                                p.codmatch()))
                        .queryParam("saison", p.saison())
                        .queryParam("codent", p.codent())
                        .queryParam("codmatch", p.codmatch())
                        .encode(StandardCharsets.UTF_8)
                        .toUriString();
            } else {
                url = UriComponentsBuilder
                        .fromUriString("https://www.ffvbbeach.org/ffvbapp/resu/ffvolley_fdme.php")
                        .queryParam("saison", p.saison())
                        .queryParam("codent", p.codent())
                        .queryParam("codmatch", p.codmatch())
                        .encode(StandardCharsets.UTF_8)
                        .toUriString();
            }

            HttpHeaders h = new HttpHeaders();
            h.setAccept(MediaType.parseMediaTypes("application/pdf,*/*"));
            h.set("User-Agent", "Blockout-MobileGateway/1.0");
            method = HttpMethod.GET;
            entity = new HttpEntity<>(h);

        } else if ("address".equals(p.kind())) {
            url = "https://www.ffvbbeach.org/ffvbapp/adressier/fiche_match_ffvb.php";
            HttpHeaders h = new HttpHeaders();
            h.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            h.set("User-Agent", "Blockout-MobileGateway/1.0");
            var form = new org.springframework.util.LinkedMultiValueMap<String, String>();
            form.add("wss_saison", p.saison());
            form.add("codmatch", p.codmatch());
            form.add("codent", p.codent());
            method = HttpMethod.POST;
            entity = new HttpEntity<>(form, h);

        } else {
            resp.sendError(400, "Invalid kind");
            return;
        }

        ResponseEntity<byte[]> upstream = restTemplate.exchange(url, method, entity, byte[].class);

        if (!upstream.getStatusCode().is2xxSuccessful() || upstream.getBody() == null) {
            resp.setStatus(upstream.getStatusCode().value());
            resp.setContentType("text/plain; charset=utf-8");
            resp.getOutputStream()
                    .write(("Upstream error: " + upstream.getStatusCode().value()).getBytes(StandardCharsets.UTF_8));
            return;
        }

        resp.setStatus(200);
        resp.setHeader("Content-Type", "application/pdf");
        resp.setHeader("Content-Disposition", "inline; filename=\"document.pdf\"");
        resp.setHeader("Cache-Control", "private, no-store");
        resp.getOutputStream().write(upstream.getBody());

        log.info("FFVB PDF ok",
                keyValue("kind", p.kind()),
                keyValue("size", upstream.getBody().length),
                keyValue("ms", Duration.between(start, Instant.now()).toMillis()));
    }
}