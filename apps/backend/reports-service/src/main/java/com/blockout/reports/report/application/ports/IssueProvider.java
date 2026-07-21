package com.blockout.reports.report.application.ports;

import com.blockout.reports.report.application.views.IssueDraft;
import com.blockout.reports.report.application.views.ReportView;

import java.util.List;

public interface IssueProvider {
    ReportView create(IssueDraft draft);

    void appendImages(int issueNumber, List<String> imageUrls);
}
