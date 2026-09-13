package com.blockout.backend.api;

import com.blockout.backend.api.config.AuthProperties;
import com.blockout.backend.jobs.config.JobsConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Import;

/** Starts the replacement HTTP process with shared jobs and feature-owned API configuration. */
@SpringBootApplication
@Import(JobsConfiguration.class)
@EnableConfigurationProperties(AuthProperties.class)
public class ApiApplication {
  /**
   * Bootstraps Spring and lets the application context own runtime resources.
   *
   * @param args Spring Boot command-line configuration arguments
   */
  public static void main(String[] args) {
    SpringApplication.run(ApiApplication.class, args);
  }
}
