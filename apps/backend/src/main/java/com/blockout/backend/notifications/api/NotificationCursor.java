package com.blockout.backend.notifications.api;

import com.blockout.backend.notifications.application.InboxViews.Continuation;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** URL-safe encoding of only the original UTC creation instant and UUID; grants no authority. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class NotificationCursor {
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
   * Decodes a continuation with the JDK parsers, retaining only microsecond keys in the canonical
   * format emitted by {@link #encode}. No separate date or UUID grammar is maintained.
   *
   * @param cursor token supplied by a client, absent for a fresh traversal
   * @return exact continuation, or null
   * @throws ResponseStatusException for malformed syntax, keys or unsupported precision
   */
  public static Continuation decode(String cursor) {
    if (cursor == null) return null;
    try {
      if (cursor.length() > 128) throw new IllegalArgumentException();
      String decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.US_ASCII);
      int separator = decoded.indexOf('/');
      if (separator < 0) throw new IllegalArgumentException();
      Continuation keys =
          new Continuation(
              Instant.parse(decoded.substring(0, separator)),
              UUID.fromString(decoded.substring(separator + 1)));
      if (keys.createdAt().getNano() % 1000 != 0 || !cursor.equals(encode(keys)))
        throw new IllegalArgumentException();
      return keys;
    } catch (IllegalArgumentException | DateTimeParseException invalid) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    }
  }
}
