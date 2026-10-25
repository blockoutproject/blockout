package com.blockout.backend.notifications.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.notifications.application.InboxViews.Continuation;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.web.server.ResponseStatusException;

/** Opaque continuation precision and syntax, independent of a retained anchor or owner registry. */
@DisplayName("Inbox continuation keys")
class NotificationCursorTest {
  @ParameterizedTest
  @ValueSource(
      strings = {
        "2026-10-25T12:00:00Z",
        "2026-10-25T12:00:00.123Z",
        "2026-10-25T12:00:00.000001Z",
        "2026-10-25T12:00:00.123456Z"
      })
  @DisplayName("Preserves all PostgreSQL microseconds and UUID bits")
  void preservesPrecision(String createdAt) {
    // Given
    Continuation keys =
        new Continuation(
            Instant.parse(createdAt), UUID.fromString("ffffffff-ffff-4fff-bfff-ffffffffffff"));

    // When
    String cursor = NotificationCursor.encode(keys);

    // Then
    assertThat(cursor).matches("[A-Za-z0-9_-]+");
    assertThat(NotificationCursor.decode(cursor)).isEqualTo(keys);
    assertThat(NotificationCursor.decode(null)).isNull();
    assertThat(NotificationCursor.encode(null)).isNull();
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "?", "a===", "bm90LWtleXM"})
  @DisplayName("Rejects malformed URL-safe tokens")
  void rejectsToken(String token) {
    // Given: the parameter supplies one malformed token.

    // When
    ThrowingCallable decode = () -> NotificationCursor.decode(token);

    // Then
    assertThatThrownBy(decode).isInstanceOf(ResponseStatusException.class);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "2026-10-25T12:00:00.1234567Z/ffffffff-ffff-4fff-bfff-ffffffffffff",
        "2026-10-25T12:00:00.1234560Z/ffffffff-ffff-4fff-bfff-ffffffffffff",
        "2026-02-30T12:00:00Z/ffffffff-ffff-4fff-bfff-ffffffffffff",
        "2026-10-25T12:00:00+02:00/ffffffff-ffff-4fff-bfff-ffffffffffff",
        "2026-10-25T12:00:00Z/1-1-1-1-1"
      })
  @DisplayName("Rejects unsupported timestamp precision and malformed continuation keys")
  void rejectsKeys(String text) {
    // Given
    String cursor =
        Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(text.getBytes(StandardCharsets.US_ASCII));

    // When
    ThrowingCallable decode = () -> NotificationCursor.decode(cursor);

    // Then
    assertThatThrownBy(decode).isInstanceOf(ResponseStatusException.class);
  }
}
