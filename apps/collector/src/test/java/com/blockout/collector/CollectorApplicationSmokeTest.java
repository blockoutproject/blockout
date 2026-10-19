package com.blockout.collector;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.collector.config.AcquisitionProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ConfigurableApplicationContext;

/** Verifies the independent collector starts without a database or provider connection. */
@SpringBootTest(properties = "spring.main.keep-alive=false")
@DisplayName("Collector application startup")
class CollectorApplicationSmokeTest {
  @Test
  @DisplayName("Starts the collector context without infrastructure credentials")
  void startsCollector(@Autowired ConfigurableApplicationContext context) {
    // Given
    // Spring starts the actual collector, without running source acquisition.

    // When
    boolean active = context.isActive();

    // Then
    assertThat(active).isTrue();
    assertThat(context.getBeansOfType(AcquisitionProperties.class)).hasSize(1);
  }
}
