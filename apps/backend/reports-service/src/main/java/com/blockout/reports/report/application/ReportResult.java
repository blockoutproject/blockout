package com.blockout.reports.report.application;

import java.net.URI;

/** Returns the canonical report result plus temporary v1 provider metadata. */
public record ReportResult(
        Integer number,
        URI htmlUrl,
        String title,
        Long legacyProviderId,
        String legacyProviderState) {
}
