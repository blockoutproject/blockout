package com.blockout.reports.models.dto.github;

import lombok.Data;

@Data
public class GitHubIssueResponseDTO {
    private Long id;
    private Integer number;
    private String htmlUrl;
    private String title;
    private String state;
}
