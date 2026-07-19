package com.blockout.reports;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.reports.models.dto.github.GitHubIssueResponseDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class GitHubJsonContractTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void emitsTheNativeBlockoutCamelCaseField() throws Exception {
        GitHubIssueResponseDTO response = new GitHubIssueResponseDTO();
        response.setId(1L);
        response.setNumber(2);
        response.setHtmlUrl("https://github.invalid/issues/2");

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsBytes(response));
        assertThat(json.path("htmlUrl").asText()).isEqualTo("https://github.invalid/issues/2");
        assertThat(json.has("html_url")).isFalse();
    }
}
