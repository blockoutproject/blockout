package com.blockout.mobilegateway.ffvb.application;

public interface FfvbPdfSource {

    FfvbPdfDownload downloadSheet(PdfLinkTokenService.Payload payload);

    FfvbPdfDownload downloadAddress(PdfLinkTokenService.Payload payload);
}
