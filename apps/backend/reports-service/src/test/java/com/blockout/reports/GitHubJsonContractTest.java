package com.blockout.reports;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.reports.models.dto.github.GitHubIssueResponseDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class GitHubJsonContractTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void readsTheProviderFieldButEmitsTheBlockoutCamelCaseField() throws Exception {
        GitHubIssueResponseDTO response = objectMapper.readValue(
                "{\"id\":1,\"number\":2,\"html_url\":\"https://github.invalid/issues/2\"}",
                GitHubIssueResponseDTO.class);

        assertThat(response.getHtmlUrl()).isEqualTo("https://github.invalid/issues/2");

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsBytes(response));
        assertThat(json.path("htmlUrl").asText()).isEqualTo("https://github.invalid/issues/2");
        assertThat(json.has("html_url")).isFalse();
    }
}
