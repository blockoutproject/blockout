package com.blockout.backend.contributions.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

/** Exercises local URI recognition without any provider or network collaborator. */
@DisplayName("Literal stream address recognition")
class StreamAddressTest {
  @ParameterizedTest
  @CsvSource({
    "https://youtube.com/watch?v=abc, YOUTUBE",
    "http://www.YouTube.COM/channel/a, YOUTUBE",
    "HTTPS://m.youtube.com/live/a, YOUTUBE",
    "https://youtu.be/a, YOUTUBE",
    "https://twitch.tv/channel, TWITCH",
    "http://player.twitch.tv/?channel=one, TWITCH",
    "https://facebook.com/page/live, FACEBOOK",
    "https://www.facebook.com/watch?v=1, FACEBOOK",
    "https://fb.watch/a, FACEBOOK",
    "https://youtube.com:8443/, YOUTUBE"
  })
  @DisplayName("Recognizes exact providers, their delimited subdomains and exact short hosts")
  void recognizesAuthorizedHosts(String literal, StreamAddress.Platform platform) {
    // Given
    // The table supplies the literal address and its independently expected provider.

    // When
    StreamAddress address = new StreamAddress(literal);

    // Then
    assertThat(address.platform()).isEqualTo(platform);
    assertThat(address.value()).isEqualTo(literal);
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(
      strings = {
        " ",
        "https://youtube.com/a b",
        "//youtube.com/watch",
        "youtube.com/watch",
        "ftp://youtube.com/a",
        "javascript:youtube.com",
        "https:youtube.com/a",
        "https:///watch",
        "https://user@youtube.com/a",
        "https://@youtube.com/a",
        "https://user:pass@twitch.tv/a",
        "https://youtube.com@evil.invalid/a",
        "https://notyoutube.com/a",
        "https://youtube.com.evil.invalid/a",
        "https://youtube-com.invalid/a",
        "https://youtube.com./a",
        "https://youtube.com%2eevil.invalid/a",
        "https://youtube.com\\@evil.invalid/a",
        "https://youtube.com:bad/a",
        "https://127.0.0.1/a",
        "https://[::1]/a",
        "https://www.youtu.be/a",
        "https://www.fb.watch/a",
        "https://twitchtv.com/a",
        "https://facebοok.com/a",
        "https://youtube.com/%ZZ"
      })
  @DisplayName("Rejects malformed, credentialed, nonweb and lookalike addresses locally")
  void rejectsUnauthorizedAddresses(String literal) {
    // Given
    // The source supplies one unsupported literal without performing any provider lookup.

    // When
    ThrowingCallable recognize = () -> new StreamAddress(literal);

    // Then
    assertThatThrownBy(recognize)
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Stream address is not permitted");
  }

  @Test
  @DisplayName("Preserves path, query, fragment, escapes and host case literally")
  void preservesLiteralIdentity() {
    // Given
    String literal = "HTTPS://WWW.YouTube.COM/a/../watch?v=A%2fb&x=1#At%20One";

    // When
    StreamAddress original = new StreamAddress(literal);

    // Then
    assertThat(original.value()).isEqualTo(literal);
    assertThat(original).isEqualTo(new StreamAddress(literal));
  }

  @ParameterizedTest
  @CsvSource({
    "HTTPS://WWW.YouTube.COM/a/../watch?v=A%2fb&x=1#At%20One, https://www.youtube.com/watch?v=A%2Fb&x=1#At%20One",
    "https://youtu.be/a, https://youtube.com/watch?v=a",
    "https://youtube.com/watch?a=1&b=2, https://youtube.com/watch?b=2&a=1"
  })
  @DisplayName("Keeps distinct literal addresses distinct despite equivalent provider destinations")
  void preservesDistinctLiterals(String first, String second) {
    // Given
    StreamAddress original = new StreamAddress(first);

    // When
    StreamAddress alternative = new StreamAddress(second);

    // Then
    assertThat(alternative).isNotEqualTo(original);
  }
}
