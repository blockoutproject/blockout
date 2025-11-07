package com.blockout.mobilegateway.models.dto.report;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class GitHubIssueResponseDTO {
    private Long id;
    private Integer number;
    @JsonProperty("html_url")
    private String htmlUrl;
    private String title;
    private String state;
}