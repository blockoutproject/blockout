package com.blockout.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Entry point for the modular backend and its mobile and ingestion HTTP surfaces. */
@SpringBootApplication
public class BackendApplication {
  /**
   * Starts the backend with Spring's standard external configuration and shutdown lifecycle.
   *
   * @param args Spring Boot command-line configuration arguments
   */
  public static void main(String[] args) {
    SpringApplication.run(BackendApplication.class, args);
  }
}
