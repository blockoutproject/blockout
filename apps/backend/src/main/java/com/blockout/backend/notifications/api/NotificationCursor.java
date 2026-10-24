package com.blockout.backend.notifications.api;

import com.blockout.backend.notifications.application.InboxReadStore.Continuation;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** URL-safe encoding of only the original UTC creation instant and UUID; grants no authority. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class NotificationCursor {
  private static final Pattern KEYS =
      Pattern.compile(
          "[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]{1,6})?Z/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");

  /**
   * Encodes persisted continuation keys without retaining server-side cursor state.
   *
   * @param keys persisted microsecond-precision continuation
   * @return opaque unpadded URL-safe token, or null at exhaustion
   */
  public static String encode(Continuation keys) {
    return keys == null
        ? null
        : Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(
                (keys.createdAt() + "/" + keys.id()).getBytes(StandardCharsets.US_ASCII));
  }

  /**
   * Decodes and validates a supplied continuation before database access.
   *
   * @param cursor token supplied by a client, absent for a fresh traversal
   * @return exact continuation, or null
   * @throws ResponseStatusException for malformed syntax, keys or unsupported precision
   */
  public static Continuation decode(String cursor) {
    if (cursor == null) return null;
    try {
      if (cursor.length() > 128 || !cursor.matches("[A-Za-z0-9_-]+"))
        throw new IllegalArgumentException();
      String decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.US_ASCII);
      if (!KEYS.matcher(decoded).matches()) throw new IllegalArgumentException();
      int separator = decoded.indexOf('/');
      return new Continuation(
          Instant.parse(decoded.substring(0, separator)),
          UUID.fromString(decoded.substring(separator + 1)));
    } catch (IllegalArgumentException | DateTimeParseException invalid) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    }
  }
}
