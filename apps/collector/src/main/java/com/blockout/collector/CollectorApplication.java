package com.blockout.collector;

import com.blockout.collector.config.AcquisitionProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

/** Entry point for independent acquisition; business persistence remains in the backend. */
@SpringBootApplication
@EnableConfigurationProperties(AcquisitionProperties.class)
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
