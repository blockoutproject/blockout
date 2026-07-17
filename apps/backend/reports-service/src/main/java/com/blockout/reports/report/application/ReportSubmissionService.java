package com.blockout.reports.report.application;

import java.util.List;

/** Exposes the report-submission workflow without transport or vendor models. */
public interface ReportSubmissionService {

    /** Creates one durable provider issue from Blockout report intent and attachments. */
    ReportResult submit(ReportCommand command, List<ReportAttachment> attachments);
}
