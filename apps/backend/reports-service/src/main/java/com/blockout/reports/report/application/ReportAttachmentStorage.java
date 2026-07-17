package com.blockout.reports.report.application;

/** Stores report attachments without exposing an object-storage SDK. */
public interface ReportAttachmentStorage {

    /** Uploads one validated attachment and returns its retained public URL. */
    String upload(ReportAttachment attachment, String reportKey, int index);
}
