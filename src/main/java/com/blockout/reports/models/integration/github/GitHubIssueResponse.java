package com.blockout.reports.models.integration.github;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class GitHubIssueResponse {
    private Long id;
    private Integer number;
    @JsonProperty("html_url")
    private String htmlUrl;
    private String title;
    private String state;
}