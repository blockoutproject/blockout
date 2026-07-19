package com.blockout.mobilegateway.models.dto.report;

import com.blockout.mobilegateway.models.enums.ReportType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class ReportCreateDTO {

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
