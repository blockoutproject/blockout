package com.blockout.backend.access.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Pure value constraints; no provider, HTTP server or database is substituted for domain
 * validation.
 */
@DisplayName("Access settings value constraints")
class AccessSettingsValidationTest {
  @ParameterizedTest
  @ValueSource(strings = {"", " ", "\u00a0\ufeff"})
  @DisplayName("Requires usable plain maintenance text")
  void refusesInvalidMessage(String message) {
    // Given
    // The parameter source supplies the decisive blank message.

    // When
    ThrowingCallable validate = () -> new MaintenanceSettings(0, false, message, null);

    // Then
    assertThatThrownBy(validate).isInstanceOf(IllegalArgumentException.class);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "http://assets.example.invalid/a.png",
        "https://user:secret@assets.example.invalid/a.png",
        "relative.png"
      })
  @DisplayName("Refuses non-HTTPS or credential-bearing image destinations")
  void refusesImage(String url) {
    // Given
    // The parameter source supplies the decisive destination; the message remains usable.

    // When
    ThrowingCallable validate = () -> new MaintenanceSettings(0, false, "Prepared", url);

    // Then
    assertThatThrownBy(validate).isInstanceOf(IllegalArgumentException.class);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "2.0",
        "02.0.0",
        "2.00.0",
        "2.0.0-beta",
        "2.0.0+1",
        " 2.0.0",
        "2.0.9007199254740992",
        "99999999999999999999999999999.0.0"
      })
  @DisplayName("Rejects malformed and JavaScript-unsafe minimum components")
  void refusesVersion(String version) {
    // Given
    // Only the supplied version or destination differs from the valid complete platform group.

    // When
    ThrowingCallable validate =
        () ->
            new ApplicationVersionSettings(
                0,
                new ApplicationVersionSettings.Platform(
                    version, "https://apps.apple.com/app/id123"),
                new ApplicationVersionSettings.Platform(null, null),
                null);

    // Then
    assertThatThrownBy(validate).isInstanceOf(IllegalArgumentException.class);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "https://apps.apple.com.evil.invalid/app/id123",
        "http://apps.apple.com/app/id123",
        "https://play.google.com/store/apps/details?id=wrong.app"
      })
  @DisplayName("Rejects wrong-platform or wrong-application store destinations")
  void refusesStore(String url) {
    // Given
    // Only the supplied version or destination differs from the valid complete platform group.

    // When
    ThrowingCallable validate =
        () ->
            new ApplicationVersionSettings(
                0,
                new ApplicationVersionSettings.Platform(null, null),
                new ApplicationVersionSettings.Platform("2.0.0", url),
                null);

    // Then
    assertThatThrownBy(validate).isInstanceOf(IllegalArgumentException.class);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "https://assets.example.invalid/a.png?width=320",
        "https://assets.example.invalid/a.png"
      })
  @DisplayName("Accepts controlled HTTPS syntax without claiming remote ownership or availability")
  void acceptsPublicImageSyntax(String imageUrl) {
    // Given
    String message = "A < B remains plain text";

    // When
    MaintenanceSettings value = new MaintenanceSettings(0, false, message, imageUrl);

    // Then
    assertThat(value.imageUrl()).isEqualTo(imageUrl);
  }

  @ParameterizedTest
  @ValueSource(strings = {"0.0.0", "2.10.0", "9007199254740991.0.0"})
  @DisplayName("Accepts canonical numeric minimums up to the safe integer boundary")
  void acceptsVersion(String version) {
    // Given
    // The source includes the largest exactly representable component.

    // When
    ApplicationVersionSettings value =
        new ApplicationVersionSettings(
            0,
            new ApplicationVersionSettings.Platform(
                version, "https://apps.apple.com/fr/app/blockout/id123"),
            new ApplicationVersionSettings.Platform(null, null),
            null);

    // Then
    assertThat(value.ios().minimumVersion()).isEqualTo(version);
  }
}
