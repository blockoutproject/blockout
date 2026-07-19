package com.blockout.reports.report.application.ports;

import com.blockout.reports.report.application.views.ReportView;

public interface ReportNotifier {
    void notifyCreated(ReportView report);
}
