package com.blockout.reports.report.application;

/** Hides provider-specific notification failures behind a secret-safe application error. */
public class ReportNotificationException extends RuntimeException {

    public ReportNotificationException(Throwable cause) {
        super("Report notification failed", cause);
    }
}
