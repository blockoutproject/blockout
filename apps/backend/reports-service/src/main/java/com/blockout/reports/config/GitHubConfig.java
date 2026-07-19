package com.blockout.reports.config;

import org.kohsuke.github.GitHub;
import org.kohsuke.github.GitHubBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GitHubConfig {

    @Bean
    public GitHub gitHub(GitHubProperties props) throws Exception {
        GitHubBuilder builder = new GitHubBuilder().withOAuthToken(props.getToken());
        if (props.getApiBaseUrl() != null && !props.getApiBaseUrl().isBlank()) {
            builder = builder.withEndpoint(props.getApiBaseUrl());
        }
        return builder.build();
    }
}