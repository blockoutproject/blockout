package com.blockout.mobilegateway.models.dto.report;

import lombok.Data;

@Data
public class ReportDTO {
    private Long id;
    private Integer number;
    private String htmlUrl;
    private String title;
    private String state;
}
