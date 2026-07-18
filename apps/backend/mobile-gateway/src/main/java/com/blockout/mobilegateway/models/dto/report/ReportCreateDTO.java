package com.blockout.mobilegateway.models.dto.report;

import com.blockout.shared.model.ReportTypeEnum;
import com.fasterxml.jackson.annotation.JsonInclude;
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
    private ReportTypeEnum type;

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
