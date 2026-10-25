package com.blockout.collector.acquisition.infrastructure.provider;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.util.Set;
import org.apache.hc.core5.http.HttpHost;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

/** Qualifies allowed HTTP origins without constructing a transport or contacting a provider. */
@DisplayName("Provider origin qualification")
class ProviderOriginTest {
  @ParameterizedTest
  @CsvSource({
    "https://www.ffvb.org, https://www.ffvb.org:443/source",
    "https://www.ffvb.org:443, https://www.ffvb.org/source",
    "http://www.ffvb.org, http://www.ffvb.org:80/source",
    "http://www.ffvb.org:80, http://www.ffvb.org/source"
  })
  @DisplayName("Accepts the same origin with an omitted or explicit default port")
  void acceptsEquivalentOrigin(String allowed, String requested) {
    // Given
    Set<HttpHost> origins = Set.of(HttpHost.create(URI.create(allowed)));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
        () -> ProviderHttpClient.requireOrigin(URI.create(requested), origins);

    // Then
    assertThatCode(action).doesNotThrowAnyException();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "https://www.ffvb.org:444/source",
        "http://www.ffvb.org/source",
        "https://foreign.example/source"
      })
  @DisplayName("Keeps different ports, schemes and hosts outside the allowed origin")
  void refusesDifferentOrigin(String requested) {
    // Given
    Set<HttpHost> origins = Set.of(HttpHost.create(URI.create("https://www.ffvb.org")));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable action =
        () -> ProviderHttpClient.requireOrigin(URI.create(requested), origins);

    // Then
    assertThatThrownBy(action).isInstanceOf(IllegalArgumentException.class);
  }
}
