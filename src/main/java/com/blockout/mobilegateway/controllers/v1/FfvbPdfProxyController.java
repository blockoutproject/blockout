package com.blockout.mobilegateway.controllers.v1;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/v1/mobile/ffvb")
public class FfvbPdfProxyController {

    Logger logger = Logger.getLogger(FfvbPdfProxyController.class.getName());

    private final RestTemplate restTemplate;

    FfvbPdfProxyController(@Qualifier("externalRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping("/pdf")
    public void proxy(@RequestParam String kind,
            @RequestParam String saison,
            @RequestParam String codent,
            @RequestParam String codmatch,
            HttpServletResponse resp) throws Exception {

        ResponseEntity<byte[]> upstream;

        logger.info("Proxying FFVB PDF request"
                + " kind=" + kind
                + " saison=" + saison
                + " codent=" + codent
                + " codmatch=" + codmatch);

        if ("sheet".equals(kind)) {
            String url = URI.create("http://www.ffvbbeach.org/ffvbapp/resu/ffvolley_fdme.php" +
                    "?saison=" + enc(saison) +
                    "&codent=" + enc(codent) +
                    "&codmatch=" + enc(codmatch)).toString();

            HttpHeaders h = new HttpHeaders();
            h.setAccept(MediaType.parseMediaTypes("application/pdf,*/*"));
            h.set("User-Agent", "Blockout-MobileGateway/1.0");

            upstream = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(h), byte[].class);

        } else if ("address".equals(kind)) {
            String url = "http://www.ffvbbeach.org/ffvbapp/adressier/fiche_match_ffvb.php";

            HttpHeaders h = new HttpHeaders();
            h.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            h.set("User-Agent", "Blockout-MobileGateway/1.0");

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("wss_saison", saison);
            form.add("codmatch", codmatch);
            form.add("codent", codent);

            upstream = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(form, h), byte[].class);

        } else {
            resp.sendError(400, "Invalid kind (use 'sheet' or 'address')");
            return;
        }

        if (!upstream.getStatusCode().is2xxSuccessful() || upstream.getBody() == null) {
            resp.setStatus(upstream.getStatusCode().value());
            resp.setContentType("text/plain; charset=utf-8");
            resp.getOutputStream().write(("Upstream error: " + upstream.getStatusCode().value())
                    .getBytes(StandardCharsets.UTF_8));
            return;
        }

        resp.setStatus(200);
        resp.setHeader("Content-Type", "application/pdf");
        resp.setHeader("Content-Disposition", "inline; filename=\"document.pdf\"");
        resp.setHeader("Cache-Control", "private, no-store");
        resp.getOutputStream().write(upstream.getBody());
    }

    private String enc(String s) {
        return java.net.URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}