package com.blockout.collector;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Entry point for independent acquisition; business persistence remains in the backend. */
@SpringBootApplication
public class CollectorApplication {
  /**
   * Starts the collector with Spring's standard external configuration and shutdown lifecycle.
   *
   * @param args Spring Boot command-line configuration arguments
   */
  public static void main(String[] args) {
    SpringApplication.run(CollectorApplication.class, args);
  }
}
