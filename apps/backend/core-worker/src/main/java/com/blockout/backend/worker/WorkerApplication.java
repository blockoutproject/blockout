package com.blockout.backend.worker;

import com.blockout.backend.identity.config.IdentitySchemaConfiguration;
import com.blockout.backend.jobs.config.JobsConfiguration;
import com.blockout.backend.worker.config.WorkerProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;

/**
 * Starts the replacement worker with queue operations and credential-free identity schema
 * readiness.
 */
@SpringBootApplication
@Import({JobsConfiguration.class, IdentitySchemaConfiguration.class})
@EnableConfigurationProperties(WorkerProperties.class)
public class WorkerApplication {
  /**
   * Bootstraps the worker; Spring owns its scheduler and shutdown lifecycle.
   *
   * @param args Spring Boot command-line configuration arguments
   */
  public static void main(String[] args) {
    SpringApplication.run(WorkerApplication.class, args);
  }
}
