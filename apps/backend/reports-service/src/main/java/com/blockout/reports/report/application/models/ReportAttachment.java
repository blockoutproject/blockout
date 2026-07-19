package com.blockout.reports.report.application.models;

public record ReportAttachment(String originalFilename, String contentType, byte[] content) {
    public boolean isEmpty() {
        return content == null || content.length == 0;
    }
}
