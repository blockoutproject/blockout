package com.blockout.reports.models.dto.github;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class GitHubIssueRequestDTO {
    private String title;
    private String body;
    private List<String> labels;
    private List<String> assignees;
    private Integer milestone;
}