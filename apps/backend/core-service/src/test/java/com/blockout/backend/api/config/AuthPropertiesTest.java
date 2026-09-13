package com.blockout.backend.api.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.api.user.api.NativeUserProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

class AuthPropertiesTest {
  private final ApplicationContextRunner context =
      new ApplicationContextRunner()
          .withUserConfiguration(PropertiesConfiguration.class)
          .withPropertyValues(
              "blockout.auth.issuer=https://tenant.example/",
              "blockout.auth.audience=core",
              "blockout.auth.jwk-set-uri=https://tenant.example/.well-known/jwks.json",
              "blockout.identity.native-client-ids=mobile");

  @ParameterizedTest
  @ValueSource(
      strings = {
        "blockout.auth.issuer=", "blockout.auth.audience= ",
        "blockout.auth.jwk-set-uri=relative-path", "blockout.identity.native-client-ids="
      })
  void rejectsInvalidConfigurationAtStartup(String property) {
    context.withPropertyValues(property).run(c -> assertThat(c).hasFailed());
  }

  @Test
  void bindsValidPropertiesWithLocalJwksFixture() {
    context
        .withPropertyValues("blockout.auth.jwk-set-uri=http://127.0.0.1:1234/jwks")
        .run(
            c -> {
              assertThat(c).hasNotFailed();
              assertThat(c.getBean(AuthProperties.class).audience()).isEqualTo("core");
              assertThat(c.getBean(NativeUserProperties.class).nativeClientIds())
                  .containsExactly("mobile");
            });
  }

  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties({AuthProperties.class, NativeUserProperties.class})
  static class PropertiesConfiguration {}
}
