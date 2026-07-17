package com.blockout.matches.match.live.report.application;

public record ReportMatchLiveLinkCommand(
        String reason,
        String reporterAuth0Id) {
}
