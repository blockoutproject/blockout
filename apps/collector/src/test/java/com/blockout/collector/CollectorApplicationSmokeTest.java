package com.blockout.collector;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.collector.acquisition.infrastructure.CollectorStartup;
import com.blockout.collector.config.AcquisitionProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/**
 * Verifies collector wiring with registration replaced; the lifecycle suite proves its HTTP
 * protocol.
 */
@SpringBootTest(properties = "spring.main.keep-alive=false")
@DisplayName("Collector application startup")
class CollectorApplicationSmokeTest {
  @MockitoBean private CollectorStartup startup;

  @Test
  @DisplayName("Starts collector wiring without running registration")
  void startsCollector(@Autowired ConfigurableApplicationContext context) {
    // Given
    // The registration runner is controlled; no backend or provider is contacted.

    // When
    boolean active = context.isActive();

    // Then
    assertThat(active).isTrue();
    assertThat(context.getBeansOfType(AcquisitionProperties.class)).hasSize(1);
  }
}
