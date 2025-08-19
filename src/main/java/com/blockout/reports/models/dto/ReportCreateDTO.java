package com.blockout.reports.models.dto;

import com.blockout.reports.models.enums.ReportType;
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

    private String locale;

    @JsonProperty("user_id")
    private String userId;

    private String environment;

    @JsonProperty("display_bug")
    private DisplayBugDTO displayBug;

    @JsonProperty("data_error")
    private DataErrorDTO dataError;

    @JsonProperty("attachment_image_urls")
    private List<String> attachmentImageUrls;
}