package com.blockout.reports.report.api.models;

import com.blockout.reports.report.application.models.ReportType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateReportInternalRequest(
    @NotNull ReportType type,
    @NotBlank String title,
    String description,
    String appVersion,
    String userId,
    String userName,
    String screen,
    String deviceModel,
    String os,
    List<String> attachmentImageUrls) {
}
