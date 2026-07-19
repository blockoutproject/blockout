package com.blockout.reports.report.application.commands;

import com.blockout.reports.report.application.models.ReportAttachment;
import com.blockout.reports.report.application.models.ReportType;
import java.util.List;

public record CreateReportCommand(
        ReportType type,
        String title,
        String description,
        String appVersion,
        String userId,
        String userName,
        String screen,
        String deviceModel,
        String os,
        List<String> attachmentImageUrls,
        List<ReportAttachment> attachments) {}
