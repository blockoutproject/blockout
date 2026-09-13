package com.blockout.backend.identity.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

/** Checks Auth0 and billing configuration binding without contacting external services. */
class IdentityPropertiesTest {
  private final ApplicationContextRunner context =
      new ApplicationContextRunner()
          .withUserConfiguration(PropertiesConfiguration.class)
          .withPropertyValues(
              "blockout.identity.auth0.base-url=https://tenant.example",
              "blockout.identity.auth0.client-id=client",
              "blockout.identity.auth0.client-secret=synthetic-secret",
              "blockout.identity.billing.project-id=project",
              "blockout.identity.billing.environment=sandbox");

  @ParameterizedTest
  @ValueSource(
      strings = {
        "blockout.identity.auth0.base-url=relative-path",
        "blockout.identity.auth0.client-id=",
        "blockout.identity.auth0.client-secret=",
        "blockout.identity.billing.project-id=",
        "blockout.identity.billing.environment=other"
      })
  void rejectsInvalidConfigurationAtStartup(String property) {
    context.withPropertyValues(property).run(c -> assertThat(c).hasFailed());
  }

  @Test
  void acceptsConfiguredIdentityBinding() {
    context.run(
        c -> {
          assertThat(c).hasNotFailed();
          assertThat(c.getBean(BillingBindingProperties.class).environment()).isEqualTo("sandbox");
        });
  }

  /**
   * Loads only the property records under test, isolating validation from application dependencies.
   */
  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties({Auth0ProfileProperties.class, BillingBindingProperties.class})
  static class PropertiesConfiguration {}
}
