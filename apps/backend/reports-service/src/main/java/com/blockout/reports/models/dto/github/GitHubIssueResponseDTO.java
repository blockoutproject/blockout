package com.blockout.reports.models.dto.github;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class GitHubIssueResponseDTO {
    private Long id;
    private Integer number;
    @JsonAlias("html_url")
    private String htmlUrl;
    private String title;
    private String state;
}
