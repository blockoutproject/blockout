package com.blockout.mobilegateway.report.application.commands;

import com.blockout.mobilegateway.shared.application.models.ReportType;

import java.util.List;

/** Values accepted when creating a report through the gateway. */
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
        List<String> attachmentImageUrls) {
}
