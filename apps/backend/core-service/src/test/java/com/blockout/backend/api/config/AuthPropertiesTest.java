package com.blockout.backend.api.config;

import static org.assertj.core.api.Assertions.*;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

class AuthPropertiesTest {
  AuthProperties bind(String endpoint, boolean allowLoopback) {
    return new Binder(
            new MapConfigurationPropertySource(
                Map.of(
                    "blockout.auth.issuer", endpoint,
                    "blockout.auth.audience", "core",
                    "blockout.auth.jwk-set-uri", endpoint,
                    "blockout.auth.allow-insecure-loopback", allowLoopback)))
        .bind("blockout.auth", Bindable.of(AuthProperties.class))
        .get();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "http://tenant.example/",
        "https://secret@tenant.example/",
        "https://tenant.example/?token=private",
        "https://tenant.example/#fragment",
        "relative-path"
      })
  void rejectsUntrustedJwtEndpoints(String endpoint) {
    assertThatThrownBy(() -> bind(endpoint, true))
        .hasRootCauseInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void loopbackHttpRequiresExplicitOptIn() {
    assertThatThrownBy(() -> bind("http://127.0.0.1:1234/jwks", false))
        .hasRootCauseInstanceOf(IllegalArgumentException.class);
    assertThat(bind("http://127.0.0.1:1234/jwks", true).jwkSetUri())
        .isEqualTo("http://127.0.0.1:1234/jwks");
  }

  @Test
  void acceptsHttpsWithoutFixtureOptions() {
    assertThat(bind("https://tenant.example/", false).issuer())
        .isEqualTo("https://tenant.example/");
  }
}
