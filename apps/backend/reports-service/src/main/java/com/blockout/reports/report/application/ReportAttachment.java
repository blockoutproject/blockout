package com.blockout.reports.report.application;

/** Carries one multipart attachment without exposing Spring transport types. */
public record ReportAttachment(String filename, String contentType, long size, byte[] content) {

    /** Defensively owns the uploaded bytes. */
    public ReportAttachment {
        content = content.clone();
    }

    /** Prevents callers from mutating the stored attachment content. */
    @Override
    public byte[] content() {
        return content.clone();
    }
}
