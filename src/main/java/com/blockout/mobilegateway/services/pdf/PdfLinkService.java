package com.blockout.mobilegateway.services.pdf;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@Service
public class PdfLinkService {

    private final PdfTokenService tokenService;
    private final long ttlSeconds;

    public PdfLinkService(PdfTokenService tokenService,
            @Value("${pdf.link.ttl-seconds:120}") long ttlSeconds) {
        this.tokenService = tokenService;
        this.ttlSeconds = ttlSeconds;
    }

    public String sheetUrl(String saison, String codent, String codmatch) {
        return build("sheet", saison, codent, codmatch);
    }

    public String addressUrl(String saison, String codent, String codmatch) {
        return build("address", saison, codent, codmatch);
    }

    private String build(String kind, String saison, String codent, String codmatch) {
        String token = tokenService.mint(kind, saison, codent, codmatch, ttlSeconds);

        String base = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();

        return base + "/api/pdf/fetch?t=" + token;
    }
}