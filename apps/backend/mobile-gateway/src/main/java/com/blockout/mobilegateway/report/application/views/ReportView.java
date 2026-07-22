package com.blockout.mobilegateway.report.application.views;

/** Report creation result used by the gateway application layer. */
public record ReportView(Long id, Integer number, String htmlUrl, String title, String state) {
}
