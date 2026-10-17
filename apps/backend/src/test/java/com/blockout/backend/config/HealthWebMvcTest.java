package com.blockout.backend.config;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Answers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.autoconfigure.endpoint.EndpointAutoConfiguration;
import org.springframework.boot.actuate.autoconfigure.endpoint.web.WebEndpointAutoConfiguration;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.availability.ApplicationAvailabilityAutoConfiguration;
import org.springframework.boot.availability.AvailabilityChangeEvent;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.boot.health.autoconfigure.actuate.endpoint.AvailabilityProbesAutoConfiguration;
import org.springframework.boot.health.autoconfigure.actuate.endpoint.HealthEndpointAutoConfiguration;
import org.springframework.boot.health.autoconfigure.registry.HealthContributorRegistryAutoConfiguration;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.autoconfigure.actuate.endpoint.web.WebMvcHealthEndpointExtensionAutoConfiguration;
import org.springframework.boot.webmvc.autoconfigure.actuate.web.WebMvcEndpointManagementContextConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Exercises native Actuator mappings with controlled database health and real availability events.
 */
@WebMvcTest
@Import(SecurityConfiguration.class)
@ImportAutoConfiguration({
  EndpointAutoConfiguration.class,
  WebEndpointAutoConfiguration.class,
  HealthContributorRegistryAutoConfiguration.class,
  HealthEndpointAutoConfiguration.class,
  ApplicationAvailabilityAutoConfiguration.class,
  AvailabilityProbesAutoConfiguration.class,
  WebMvcHealthEndpointExtensionAutoConfiguration.class,
  WebMvcEndpointManagementContextConfiguration.class,
  SecurityAutoConfiguration.class,
  ServletWebSecurityAutoConfiguration.class
})
@DisplayName("Public native readiness boundary")
class HealthWebMvcTest {
  @Autowired private MockMvc mvc;
  @Autowired private ApplicationContext context;

  @MockitoBean(name = "dbHealthIndicator", answers = Answers.CALLS_REAL_METHODS)
  private HealthIndicator database;

  @Test
  @DisplayName("Returns only aggregate UP to an anonymous main-path GET")
  void returnsMinimalHealthyState() throws Exception {
    // Given
    AvailabilityChangeEvent.publish(context, ReadinessState.ACCEPTING_TRAFFIC);
    when(database.health())
        .thenReturn(Health.up().withDetail("private", "harmless internal fixture").build());

    // When
    ResultActions response = mvc.perform(get("/health").queryParam("showDetails", "true"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(content().json("{\"status\":\"UP\"}", JsonCompareMode.STRICT));
  }

  @ParameterizedTest
  @ValueSource(strings = {"DOWN", "OUT_OF_SERVICE", "UNKNOWN"})
  @DisplayName("Maps each non-UP database state to an aggregate-only 503")
  void refusesUnhealthyDatabase(String state) throws Exception {
    // Given
    AvailabilityChangeEvent.publish(context, ReadinessState.ACCEPTING_TRAFFIC);
    when(database.health())
        .thenReturn(Health.status(state).withDetail("private", "harmless fixture").build());

    // When
    ResultActions response = mvc.perform(get("/health"));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(content().json("{\"status\":\"" + state + "\"}", JsonCompareMode.STRICT));
  }

  @Test
  @DisplayName("Refuses traffic when application readiness is out of service")
  void refusesUnreadyApplication() throws Exception {
    // Given
    AvailabilityChangeEvent.publish(context, ReadinessState.REFUSING_TRAFFIC);
    when(database.health()).thenReturn(Health.up().build());

    // When
    ResultActions response = mvc.perform(get("/health"));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(content().json("{\"status\":\"OUT_OF_SERVICE\"}", JsonCompareMode.STRICT));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/actuator",
        "/actuator/health",
        "/actuator/health/readiness",
        "/actuator/health/db",
        "/actuator/env",
        "/actuator/metrics",
        "/health/db"
      })
  @DisplayName("Denies anonymous diagnostic and component paths")
  void deniesDiagnostics(String path) throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get(path);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isForbidden());
  }

  @ParameterizedTest
  @ValueSource(strings = {"HEAD", "POST"})
  @DisplayName("Denies non-GET probe methods")
  void refusesOtherMethods(String method) throws Exception {
    // Given
    MockHttpServletRequestBuilder request = request(HttpMethod.valueOf(method), "/health");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isForbidden());
  }
}
