package com.blockout.mobilegateway.models.dto.report;

import com.blockout.mobilegateway.models.enums.ReportType;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ReportCreateDTO {

    @NotNull
    private ReportType type;

    @NotBlank
    private String title;

    private String description;

    @JsonProperty("app_version")
    private String appVersion;

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("user_name")
    private String userName;

    private String screen;

    @JsonProperty("device_model")
    private String deviceModel;

    private String os;

    @JsonProperty("attachment_image_urls")
    private List<String> attachmentImageUrls;
}