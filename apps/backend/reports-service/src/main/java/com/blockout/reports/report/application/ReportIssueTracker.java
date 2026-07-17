package com.blockout.reports.report.application;

import java.util.List;

/** Owns the issue-provider effects needed by report submission. */
public interface ReportIssueTracker {

    /** Creates the durable issue from Blockout report intent. */
    ReportResult create(ReportCommand command);

    /** Best-effort appends uploaded image URLs to the durable issue body. */
    void appendImages(int issueNumber, List<String> imageUrls);
}
