package com.blockout.backend.api;

import com.blockout.backend.api.config.AuthProperties;
import com.blockout.backend.jobs.config.JobsConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@Import(JobsConfiguration.class)
@EnableConfigurationProperties(AuthProperties.class)
public class ApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(ApiApplication.class, args);
  }
}
