package com.blockout.mobilegateway.report.api.models;

import com.blockout.mobilegateway.shared.application.models.ReportType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class CreateReportRequest {

    @NotNull
    private ReportType type;

    @NotBlank
    private String title;

    private String description;

    private String appVersion;

    private String userId;

    private String userName;

    private String screen;

    private String deviceModel;

    private String os;

    private List<String> attachmentImageUrls;
}
