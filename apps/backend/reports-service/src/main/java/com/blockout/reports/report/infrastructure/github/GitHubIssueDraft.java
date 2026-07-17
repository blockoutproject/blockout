package com.blockout.reports.report.infrastructure.github;

import java.util.List;

/** Carries the provider-owned GitHub issue construction inputs. */
public record GitHubIssueDraft(
        String title,
        String body,
        List<String> labels,
        List<String> assignees,
        Integer milestone) {
}
