package com.blockout.mobilegateway.ffvb.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FfvbPdfApplicationService {

    private final PdfLinkTokenService tokenService;
    private final FfvbPdfSource pdfSource;

    public FfvbPdfDownload download(String token) {
        PdfLinkTokenService.Payload payload = tokenService.validate(token);

        return switch (payload.kind()) {
            case "sheet" -> pdfSource.downloadSheet(payload);
            case "address" -> pdfSource.downloadAddress(payload);
            default -> throw new IllegalArgumentException("Invalid PDF kind");
        };
    }
}
