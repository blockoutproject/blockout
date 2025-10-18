package com.blockout.mobilegateway.controllers.v1;

import com.blockout.mobilegateway.services.clients.ApiClientService;
import lombok.RequiredArgsConstructor;
import net.logstash.logback.argument.StructuredArguments;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@RestController
@RequestMapping("/api/v1/mobile/ffvb")
@RequiredArgsConstructor
public class FfvbPdfProxyController {

    private static final Logger logger = LoggerFactory.getLogger(FfvbPdfProxyController.class);

    private final @Qualifier("externalRestTemplate") RestTemplate restTemplate;

    @GetMapping("/pdf")
    public void proxy(
            @RequestParam String kind,
            @RequestParam String saison,
            @RequestParam String codent,
            @RequestParam String codmatch,
            HttpServletResponse resp) throws Exception {

        Instant start = Instant.now();

        logger.info("FFVB PDF proxy request received",
                keyValue("kind", kind),
                keyValue("saison", saison),
                keyValue("codent", codent),
                keyValue("codmatch", codmatch));

        ResponseEntity<byte[]> upstream;
        String url;

        try {
            if ("sheet".equals(kind)) {
                url = "https://www.ffvbbeach.org/ffvbapp/resu/ffvolley_fdme.php" +
                        "?saison=" + enc(saison) +
                        "&codent=" + enc(codent) +
                        "&codmatch=" + enc(codmatch);

                HttpHeaders headers = new HttpHeaders();
                headers.setAccept(MediaType.parseMediaTypes("application/pdf,*/*"));
                headers.set("User-Agent", "Blockout-MobileGateway/1.0");

                logger.info("Calling FFVB (sheet)",
                        keyValue("url", url));

                upstream = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(headers), byte[].class);

            } else if ("address".equals(kind)) {
                url = "https://www.ffvbbeach.org/ffvbapp/adressier/fiche_match_ffvb.php";

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
                headers.set("User-Agent", "Blockout-MobileGateway/1.0");

                MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
                form.add("wss_saison", saison);
                form.add("codmatch", codmatch);
                form.add("codent", codent);

                logger.info("Calling FFVB (address)",
                        keyValue("url", url),
                        keyValue("form", form));

                upstream = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(form, headers), byte[].class);

            } else {
                logger.warn("Invalid kind parameter",
                        keyValue("kind", kind));
                resp.sendError(400, "Invalid kind (use 'sheet' or 'address')");
                return;
            }

        } catch (RestClientException e) {
            logger.error("Error calling FFVB",
                    keyValue("kind", kind),
                    keyValue("saison", saison),
                    keyValue("codent", codent),
                    keyValue("codmatch", codmatch),
                    keyValue("message", e.getMessage()));
            resp.setStatus(502);
            resp.setContentType("text/plain; charset=utf-8");
            resp.getOutputStream().write(("Error calling FFVB: " + e.getMessage()).getBytes(StandardCharsets.UTF_8));
            return;
        }

        long durationMs = Duration.between(start, Instant.now()).toMillis();

        if (upstream == null) {
            logger.warn("No response from FFVB",
                    keyValue("kind", kind),
                    keyValue("durationMs", durationMs));
            resp.setStatus(502);
            resp.getOutputStream().write("No upstream response".getBytes(StandardCharsets.UTF_8));
            return;
        }

        logger.info("FFVB responded",
                keyValue("status", upstream.getStatusCodeValue()),
                keyValue("durationMs", durationMs),
                keyValue("contentLength", upstream.getBody() != null ? upstream.getBody().length : -1));

        if (!upstream.getStatusCode().is2xxSuccessful() || upstream.getBody() == null) {
            resp.setStatus(upstream.getStatusCodeValue());
            resp.setContentType("text/plain; charset=utf-8");
            String msg = "Upstream error: " + upstream.getStatusCodeValue();
            logger.warn("Upstream returned error",
                    keyValue("status", upstream.getStatusCodeValue()),
                    keyValue("kind", kind),
                    keyValue("url", upstream));
            resp.getOutputStream().write(msg.getBytes(StandardCharsets.UTF_8));
            return;
        }

        resp.setStatus(200);
        resp.setHeader("Content-Type", "application/pdf");
        resp.setHeader("Content-Disposition", "inline; filename=\"document.pdf\"");
        resp.setHeader("Cache-Control", "private, no-store");
        resp.getOutputStream().write(upstream.getBody());

        logger.info("PDF forwarded successfully",
                keyValue("size", upstream.getBody().length),
                keyValue("durationMs", durationMs),
                keyValue("kind", kind));
    }

    private String enc(String s) {
        return java.net.URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}