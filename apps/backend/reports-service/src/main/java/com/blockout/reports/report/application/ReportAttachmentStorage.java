package com.blockout.reports.report.application;

/** Stores report attachments without exposing an object-storage SDK. */
public interface ReportAttachmentStorage {

    /** Uploads one planned attachment and returns its retained public URL. */
    String upload(ReportSubmissionPlan.AttachmentUpload upload);
}
