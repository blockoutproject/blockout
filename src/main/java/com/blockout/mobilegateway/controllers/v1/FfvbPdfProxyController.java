package com.blockout.mobilegateway.controllers.v1;

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
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@RestController
@RequestMapping("/api/v1/mobile/public/ffvb")
public class FfvbPdfProxyController {

    private static final Logger logger = LoggerFactory.getLogger(FfvbPdfProxyController.class);

    private final RestTemplate restTemplate;

    FfvbPdfProxyController(@Qualifier("externalRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping("/pdf")
    public void proxy(
            @RequestParam String kind,
            @RequestParam String saison,
            @RequestParam String codent,
            @RequestParam String codmatch,
            HttpServletResponse resp) throws Exception {

        String reqId = genRequestId();
        Instant start = Instant.now();

        logger.info("FFVB PDF proxy request received",
                keyValue("reqId", reqId),
                keyValue("kind", kind),
                keyValue("saison", saison),
                keyValue("codent", codent),
                keyValue("codmatch", codmatch),
                keyValue("restTemplate", restTemplate.getRequestFactory().getClass().getSimpleName()));

        ResponseEntity<byte[]> upstream;
        String url;

        try {
            if ("sheet".equals(kind)) {
                url = "https://www.ffvbbeach.org/ffvbapp/resu/ffvolley_fdme.php" +
                        "?saison=" + enc(saison) +
                        "&codent=" + enc(codent) +
                        "&codmatch=" + enc(codmatch);

                HttpHeaders headers = new HttpHeaders();
                // On garde volontairement minimal, mais on LOG ce qu'on envoie.
                // (Tu peux décommenter si besoin d’un Referer)
                // headers.set("Referer", "https://www.ffvbbeach.org/ffvbapp/resu/");

                logger.info("Calling FFVB (sheet)",
                        keyValue("reqId", reqId),
                        keyValue("url", url),
                        keyValue("outHeaders", headersToMap(headers)));

                Instant callStart = Instant.now();
                upstream = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), byte[].class);
                long upstreamMs = Duration.between(callStart, Instant.now()).toMillis();

                logger.info("FFVB upstream returned (sheet)",
                        keyValue("reqId", reqId),
                        keyValue("status", upstream.getStatusCode().value()),
                        keyValue("t_upstream_ms", upstreamMs),
                        keyValue("respHeaders", headersToMap(upstream.getHeaders())));

            } else if ("address".equals(kind)) {
                url = "https://www.ffvbbeach.org/ffvbapp/adressier/fiche_match_ffvb.php";

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
                // headers.set("Referer", "https://www.ffvbbeach.org/ffvbapp/adressier/");

                MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
                form.add("wss_saison", saison);
                form.add("codmatch", codmatch);
                form.add("codent", codent);

                logger.info("Calling FFVB (address)",
                        keyValue("reqId", reqId),
                        keyValue("url", url),
                        keyValue("form", form),
                        keyValue("outHeaders", headersToMap(headers)));

                Instant callStart = Instant.now();
                upstream = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(form, headers), byte[].class);
                long upstreamMs = Duration.between(callStart, Instant.now()).toMillis();

                logger.info("FFVB upstream returned (address)",
                        keyValue("reqId", reqId),
                        keyValue("status", upstream.getStatusCode().value()),
                        keyValue("t_upstream_ms", upstreamMs),
                        keyValue("respHeaders", headersToMap(upstream.getHeaders())));

            } else {
                logger.warn("Invalid kind parameter",
                        keyValue("reqId", reqId),
                        keyValue("kind", kind));
                resp.sendError(400, "Invalid kind (use 'sheet' or 'address')");
                return;
            }

        } catch (RestClientException e) {
            logger.error("Error calling FFVB",
                    keyValue("reqId", reqId),
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

        byte[] body = upstream.getBody();
        int status = upstream.getStatusCode().value();
        HttpHeaders upHeaders = upstream.getHeaders();

        // --- Analyse PDF binaire (diagnostic)
        String sha256 = sha256(body);
        int len = (body != null ? body.length : -1);
        String pdfVersion = sniffPdfVersion(body);         // ex: "%PDF-1.7"
        String magic = firstBytesHex(body, 8);             // ex: 25 50 44 46 ...
        boolean hasAcroForm = containsAscii(body, "/AcroForm");
        boolean hasXfa = containsAscii(body, "/XFA");
        boolean hasJs = containsAscii(body, "/JS") || containsAscii(body, "/JavaScript");
        boolean hasOpenAction = containsAscii(body, "/OpenAction");

        logger.info("FFVB responded",
                keyValue("reqId", reqId),
                keyValue("status", status),
                keyValue("durationMs", durationMs),
                keyValue("contentType", upHeaders.getFirst("Content-Type")),
                keyValue("disposition", upHeaders.getFirst("Content-Disposition")),
                keyValue("cacheControl", upHeaders.getFirst("Cache-Control")),
                keyValue("pragma", upHeaders.getFirst("Pragma")),
                keyValue("expires", upHeaders.getFirst("Expires")),
                keyValue("server", upHeaders.getFirst("Server")),
                keyValue("contentLength", len),
                keyValue("sha256", sha256),
                keyValue("pdfVersion", pdfVersion),
                keyValue("magic8", magic),
                keyValue("hasAcroForm", hasAcroForm),
                keyValue("hasXFA", hasXfa),
                keyValue("hasJS", hasJs),
                keyValue("hasOpenAction", hasOpenAction));

        if (!upstream.getStatusCode().is2xxSuccessful() || body == null) {
            resp.setStatus(status);
            resp.setContentType("text/plain; charset=utf-8");
            String msg = "Upstream error: " + status;
            logger.warn("Upstream returned error",
                    keyValue("reqId", reqId),
                    keyValue("status", status),
                    keyValue("kind", kind),
                    keyValue("url", "REDACTED"));
            resp.getOutputStream().write(msg.getBytes(StandardCharsets.UTF_8));
            return;
        }

        // Réponse client
        resp.setStatus(200);
        resp.setHeader("Content-Type", "application/pdf");
        resp.setHeader("Content-Disposition", "inline; filename=\"document.pdf\"");
        resp.setHeader("Cache-Control", "private, no-store");
        resp.getOutputStream().write(body);

        logger.info("PDF forwarded successfully",
                keyValue("reqId", reqId),
                keyValue("size", len),
                keyValue("durationMs", durationMs),
                keyValue("kind", kind));
    }

    private String enc(String s) {
        return java.net.URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    // ----- Utils logging/diagnostic

    private static Map<String, Object> headersToMap(HttpHeaders headers) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (headers == null) return map;
        headers.forEach((k, v) -> map.put(k, (v == null ? null : String.join("|", v))));
        return map;
    }

    private static String sha256(byte[] data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] d = md.digest(data == null ? new byte[0] : data);
            StringBuilder sb = new StringBuilder(d.length * 2);
            for (byte b : d) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return "n/a";
        }
    }

    private static String sniffPdfVersion(byte[] data) {
        if (data == null || data.length < 8) return "unknown";
        // Cherche la ligne %PDF-x.y en tête
        int max = Math.min(data.length, 32);
        String head = new String(data, 0, max, StandardCharsets.ISO_8859_1);
        int idx = head.indexOf("%PDF-");
        if (idx >= 0 && idx + 8 <= head.length()) {
            // %PDF-1.7 ou similaire
            for (int len = 7; len <= 10 && idx + len <= head.length(); len++) {
                String cand = head.substring(idx, idx + len);
                if (cand.matches("%PDF-\\d(\\.\\d)?")) return cand;
            }
            return "%PDF";
        }
        return "unknown";
    }

    private static String firstBytesHex(byte[] data, int n) {
        if (data == null || data.length == 0) return "n/a";
        int m = Math.min(n, data.length);
        StringBuilder sb = new StringBuilder(m * 3);
        for (int i = 0; i < m; i++) sb.append(String.format("%02x", data[i])).append(i + 1 < m ? " " : "");
        return sb.toString();
    }

    private static boolean containsAscii(byte[] data, String token) {
        if (data == null || token == null) return false;
        byte[] t = token.getBytes(StandardCharsets.ISO_8859_1);
        outer:
        for (int i = 0; i <= data.length - t.length; i++) {
            for (int j = 0; j < t.length; j++) {
                if (data[i + j] != t[j]) continue outer;
            }
            return true;
        }
        return false;
    }

    private static String genRequestId() {
        long ts = System.currentTimeMillis();
        long rnd = ThreadLocalRandom.current().nextLong(1_000_000_000L);
        return ts + "-" + rnd;
    }
}