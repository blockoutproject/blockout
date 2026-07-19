package com.blockout.reports.report.application.ports;

import com.blockout.reports.report.application.models.ReportAttachment;

public interface ReportImageStorage {
    String upload(ReportAttachment attachment, String reportKey, int index);
}
