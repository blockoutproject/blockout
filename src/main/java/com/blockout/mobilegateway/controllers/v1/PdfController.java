package com.blockout.mobilegateway.controllers.v1;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import com.blockout.mobilegateway.services.pdf.PdfTokenService;

import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/mobile/pdf")
public class PdfController {

    private final PdfTokenService tokenService;

    private final RestTemplate restTemplate;

    PdfController(PdfTokenService tokenService, @Qualifier("externalRestTemplate") RestTemplate restTemplate) {
        this.tokenService = tokenService;
        this.restTemplate = restTemplate;
    }

    @GetMapping("/fetch")
    public void fetch(@RequestParam("t") String token, HttpServletResponse resp) throws Exception {
        Map<String, Object> c = tokenService.verify(token);
        String kind = (String) c.get("kind");
        String saison = (String) c.get("saison");
        String codent = (String) c.get("codent");
        String codmatch = (String) c.get("codmatch");

        ResponseEntity<byte[]> upstream;

        if ("sheet".equals(kind)) {
            String url = URI.create("https://www.ffvbbeach.org/ffvbapp/resu/ffvolley_fdme.php" +
                    "?saison=" + enc(saison) +
                    "&codent=" + enc(codent) +
                    "&codmatch=" + enc(codmatch)).toString();

            HttpHeaders h = new HttpHeaders();
            h.setAccept(MediaType.parseMediaTypes("application/pdf,*/*"));
            upstream = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(h), byte[].class);

        } else if ("address".equals(kind)) {
            String url = "https://www.ffvbbeach.org/ffvbapp/adressier/fiche_match_ffvb.php";

            HttpHeaders h = new HttpHeaders();
            h.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("wss_saison", saison);
            form.add("codmatch", codmatch);
            form.add("codent", codent);

            upstream = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(form, h), byte[].class);

        } else {
            resp.sendError(400, "Unknown kind");
            return;
        }

        if (!upstream.getStatusCode().is2xxSuccessful() || upstream.getBody() == null) {
            resp.setStatus(upstream.getStatusCode().value());
            resp.setContentType("text/plain; charset=utf-8");
            resp.getOutputStream()
                    .write(("Upstream error: " + upstream.getStatusCode().value()).getBytes(StandardCharsets.UTF_8));
            return;
        }

        // Affichage inline dans le navigateur
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