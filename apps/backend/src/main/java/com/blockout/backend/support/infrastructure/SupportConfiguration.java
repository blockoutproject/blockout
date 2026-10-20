package com.blockout.backend.support.infrastructure;

import com.blockout.backend.support.application.SupportValidation;
import java.nio.file.Path;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Binds support settings and local validation only; no provider client or submission is activated.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(SupportProperties.class)
public class SupportConfiguration {
  /**
   * Uses the process temporary directory without introducing a persistent support volume.
   *
   * @return validation owner; successful snapshots must be closed by their consuming use case
   */
  @Bean
  SupportValidation supportValidation() {
    return new SupportValidation(Path.of(System.getProperty("java.io.tmpdir")));
  }
}
