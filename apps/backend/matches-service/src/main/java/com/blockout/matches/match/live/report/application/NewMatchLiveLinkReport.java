package com.blockout.matches.match.live.report.application;

import java.time.Instant;

public record NewMatchLiveLinkReport(
        Long liveLinkId,
        String reporterAuth0Id,
        String reason,
        Instant createdAt) {
}
