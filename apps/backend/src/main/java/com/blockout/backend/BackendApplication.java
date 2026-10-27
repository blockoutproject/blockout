package com.blockout.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.AutoConfigurationExcludeFilter;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.context.TypeExcludeFilter;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.ComponentScan.Filter;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Profile;

/** Shared backend executable, with HTTP adapters excluded from the one-action operator profile. */
@SpringBootConfiguration
@EnableAutoConfiguration
@Import({BackendApplication.Serving.class, BackendApplication.InitialReconstruction.class})
public class BackendApplication {
  /**
   * Starts the serving backend, or closes the non-web context after its one operator action.
   *
   * @param args Spring Boot command-line configuration arguments
   */
  public static void main(String[] args) {
    ConfigurableApplicationContext context = SpringApplication.run(BackendApplication.class, args);
    if (context.getEnvironment().matchesProfiles("initial-reconstruction")) context.close();
  }

  /**
   * Preserves ordinary Boot component discovery, including native test and auto-config exclusions.
   */
  @Configuration(proxyBeanMethods = false)
  @Profile("!initial-reconstruction")
  @ComponentScan(
      basePackages = "com.blockout.backend",
      excludeFilters = {
        @Filter(type = FilterType.CUSTOM, classes = TypeExcludeFilter.class),
        @Filter(type = FilterType.CUSTOM, classes = AutoConfigurationExcludeFilter.class)
      })
  static class Serving {}

  /** Reuses the same application/infrastructure owners without request-scoped HTTP adapters. */
  @Configuration(proxyBeanMethods = false)
  @Profile("initial-reconstruction")
  @ComponentScan(
      basePackages = "com.blockout.backend",
      excludeFilters = {
        @Filter(type = FilterType.CUSTOM, classes = TypeExcludeFilter.class),
        @Filter(type = FilterType.CUSTOM, classes = AutoConfigurationExcludeFilter.class),
        @Filter(type = FilterType.REGEX, pattern = "com\\.blockout\\.backend\\..*\\.api\\..*")
      })
  static class InitialReconstruction {}
}
