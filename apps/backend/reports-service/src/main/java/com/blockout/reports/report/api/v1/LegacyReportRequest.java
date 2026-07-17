package com.blockout.reports.report.api.v1;

import com.blockout.shared.model.ReportTypeEnum;
import java.util.List;

/** Carries only the retained v1 snake-case report JSON shape. */
public record LegacyReportRequest(
        ReportTypeEnum type,
        String title,
        String description,
        String appVersion,
        String userId,
        String userName,
        String screen,
        String deviceModel,
        String os,
        List<String> attachmentImageUrls) {
}
