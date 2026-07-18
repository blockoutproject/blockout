package com.blockout.reports.report.infrastructure.github;

import com.blockout.reports.config.GitHubProperties;
import org.kohsuke.github.GitHub;
import org.kohsuke.github.GitHubBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Creates the GitHub SDK client inside the owning provider adapter. */
@Configuration
public class GitHubClientConfiguration {

    /** Builds the configured GitHub client without exposing SDK types to application code. */
    @Bean
    public GitHub gitHub(GitHubProperties properties) throws Exception {
        GitHubBuilder builder = new GitHubBuilder().withOAuthToken(properties.getToken());
        if (properties.getApiBaseUrl() != null && !properties.getApiBaseUrl().isBlank()) {
            builder = builder.withEndpoint(properties.getApiBaseUrl());
        }
        return builder.build();
    }
}
