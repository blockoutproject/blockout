package com.blockout.reports.report.application;

/** Sends the non-blocking report-created notification. */
public interface ReportNotifier {

    /** Notifies the configured provider about a successfully created issue. */
    void notifyCreated(ReportResult result);
}
