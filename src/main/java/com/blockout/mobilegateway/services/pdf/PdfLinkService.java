package com.blockout.mobilegateway.services.pdf;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import com.blockout.mobilegateway.config.PdfProperties;

@Service
public class PdfLinkService {

    private final PdfTokenService tokenService;
    private final PdfProperties pdfProperties;

    public PdfLinkService(PdfTokenService tokenService, PdfProperties pdfProperties) {
        this.tokenService = tokenService;
        this.pdfProperties = pdfProperties;
    }

    public String sheetUrl(String saison, String codent, String codmatch) {
        return build("sheet", saison, codent, codmatch);
    }

    public String addressUrl(String saison, String codent, String codmatch) {
        return build("address", saison, codent, codmatch);
    }

    private String build(String kind, String saison, String codent, String codmatch) {
        long ttlSeconds = pdfProperties.getLink().getTtlSeconds();

        String token = tokenService.mint(kind, saison, codent, codmatch, ttlSeconds);

        String base = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();

        return base + "/api/v1/mobile/pdf/fetch?t=" + token;
    }
}