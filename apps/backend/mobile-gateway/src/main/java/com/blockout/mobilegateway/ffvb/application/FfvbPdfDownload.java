package com.blockout.mobilegateway.ffvb.application;

public record FfvbPdfDownload(int statusCode, byte[] content, boolean transportError) {
}
