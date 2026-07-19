package com.blockout.mobilegateway.report.api.models;

import lombok.Data;

@Data
public class ReportResponse {
    private Long id;
    private Integer number;
    private String htmlUrl;
    private String title;
    private String state;
}
