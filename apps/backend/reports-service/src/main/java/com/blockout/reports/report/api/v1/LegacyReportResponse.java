package com.blockout.reports.report.api.v1;

/** Carries the retained provider-shaped v1 report response. */
public record LegacyReportResponse(
        Long id,
        Integer number,
        String htmlUrl,
        String title,
        String state) {
}
