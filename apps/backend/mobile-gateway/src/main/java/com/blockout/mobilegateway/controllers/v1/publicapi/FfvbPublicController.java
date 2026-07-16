package com.blockout.mobilegateway.controllers.v1.publicapi;

import com.blockout.mobilegateway.services.PdfLinkTokenService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@RestController
@RequestMapping("/api/v1/mobile/public/ffvb")
public class FfvbPublicController {

    private static final Logger logger = LoggerFactory.getLogger(FfvbPublicController.class);

    private final RestTemplate restTemplate;
    private final PdfLinkTokenService tokenService;

    public FfvbPublicController(
            @Qualifier("externalRestTemplate") RestTemplate restTemplate,
            PdfLinkTokenService tokenService) {
        this.restTemplate = restTemplate;
        this.tokenService = tokenService;
    }

    @GetMapping("/pdf/{token}")
    public void proxySigned(@PathVariable String token, HttpServletResponse resp) throws Exception {
        Instant start = Instant.now();

        logger.info("FFVB PDF request received", keyValue("token", token));

        try {
            PdfLinkTokenService.Payload p;

            try {
                p = tokenService.validate(token);
                logger.info("Token validated",
                        keyValue("kind", p.kind()),
                        keyValue("saison", p.saison()),
                        keyValue("codent", p.codent()),
                        keyValue("codmatch", p.codmatch()));
            } catch (JwtException e) {
                logger.warn("Invalid token", e);
                resp.sendError(401, "Invalid or expired link");
                return;
            }

            String url;
            HttpMethod method;
            HttpEntity<?> entity;

            if ("sheet".equals(p.kind())) {
                if ("AALNV".equals(p.codent())) {
                    String genderFolder = p.codmatch().startsWith("SPS") ? "Women" : "Men";
                    url = UriComponentsBuilder
                            .fromUriString(String.format(
                                    "https://www.lnv.fr/pdf/2025/DataVolley/%s/%s-2026.pdf",
                                    genderFolder, p.codmatch()))
                            .toUriString();
                } else {
                    url = UriComponentsBuilder
                            .fromUriString("https://www.ffvbbeach.org/ffvbapp/resu/ffvolley_fdme.php")
                            .queryParam("saison", p.saison())
                            .queryParam("codent", p.codent())
                            .queryParam("codmatch", p.codmatch())
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
                logger.warn("Invalid kind received", keyValue("kind", p.kind()));
                resp.sendError(400, "Invalid kind");
                return;
            }

            logger.info("Calling upstream",
                    keyValue("method", method),
                    keyValue("url", url));

            ResponseEntity<byte[]> upstream;

            try {
                upstream = restTemplate.exchange(url, method, entity, byte[].class);
            } catch (HttpStatusCodeException e) {
                logger.error("Upstream HTTP error",
                        keyValue("status", e.getStatusCode().value()),
                        keyValue("body", e.getResponseBodyAsString()),
                        e);

                resp.sendError(502, "Upstream error");
                return;
            }

            if (!upstream.getStatusCode().is2xxSuccessful() || upstream.getBody() == null) {
                logger.error("Upstream non-success response",
                        keyValue("status", upstream.getStatusCode().value()));

                resp.setStatus(upstream.getStatusCode().value());
                resp.setContentType("text/plain; charset=utf-8");
                resp.getOutputStream()
                        .write(("Upstream error: " + upstream.getStatusCode().value())
                                .getBytes(StandardCharsets.UTF_8));
                return;
            }

            resp.setStatus(200);
            resp.setHeader("Content-Type", "application/pdf");
            resp.setHeader("Content-Disposition", "inline; filename=\"document.pdf\"");
            resp.setHeader("Cache-Control", "private, no-store");
            resp.getOutputStream().write(upstream.getBody());

            logger.info("FFVB PDF success",
                    keyValue("size", upstream.getBody().length),
                    keyValue("ms", Duration.between(start, Instant.now()).toMillis()));

        } catch (Exception e) {
            logger.error("Unhandled exception in proxySigned", e);

            if (!resp.isCommitted()) {
                resp.sendError(500, "Internal error");
            }

            logger.error("Request failed",
                    keyValue("ms", Duration.between(start, Instant.now()).toMillis()));
        }
    }
}