package com.blockout.backend.notifications.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.notifications.domain.NotificationMessage.Facts;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/** Safe current editorial independent of persisted sporting text and native presentation. */
@DisplayName("Stable French notification messages")
class NotificationMessageTest {
  @ParameterizedTest
  @EnumSource(NotificationFamily.class)
  @DisplayName("Provides three distinct French variants with the same reliable facts")
  void providesFrenchVariants(NotificationFamily family) {
    // Given
    Facts facts = new Facts("Nantes", "Tours", true, 3, 1, null, true);

    // When
    List<NotificationMessage> messages =
        Arrays.stream(NotificationVariant.values())
            .map(variant -> NotificationMessage.render(family, variant, facts))
            .toList();

    // Then
    assertThat(messages).hasSizeGreaterThanOrEqualTo(3).doesNotHaveDuplicates();
    assertThat(messages)
        .allSatisfy(
            message -> {
              assertThat(message.body()).contains("Nantes", "Tours");
              assertThat(message.title() + message.body())
                  .doesNotContain("gratuit", "vérifié", "en cours", "vite", "victoire");
              if (family == NotificationFamily.PLAIN_RESULT
                  || family == NotificationFamily.ENRICHED_RESULT)
                assertThat(message.body()).contains("3–1");
            });
  }

  @ParameterizedTest
  @EnumSource(NotificationFamily.class)
  @DisplayName("Keeps choice across devices and removes withdrawn result and link fragments")
  void adaptsCurrentFacts(NotificationFamily family) {
    // Given
    UUID notification = UUID.fromString("00000000-0000-4000-8000-000000000245");
    NotificationVariant stored = NotificationVariant.choose(notification);
    Facts corrected = new Facts(null, " ", false, 3, 1, null, false);

    // When
    NotificationMessage firstDevice = NotificationMessage.render(family, stored, corrected);
    NotificationMessage secondDevice =
        NotificationMessage.render(family, NotificationVariant.choose(notification), corrected);

    // Then
    assertThat(firstDevice).isEqualTo(secondDevice);
    assertThat(firstDevice.body())
        .doesNotContain("3–1", "null", "disponible", "victoire", "en direct");
    assertThat(firstDevice.body()).contains("match");
  }

  @ParameterizedTest
  @EnumSource(NotificationVariant.class)
  @DisplayName("Uses honest missing-score and special-result fallbacks without naming a winner")
  void supportsUnknownScores(NotificationVariant variant) {
    // Given
    Facts special = new Facts("Nantes", null, true, null, null, "F/P", false);

    // When
    NotificationMessage message =
        NotificationMessage.render(NotificationFamily.ENRICHED_RESULT, variant, special);

    // Then
    assertThat(message.body())
        .contains("Nantes", "F/P")
        .doesNotContain("3–0", "victoire", "disponible", "null");
    assertThat(
            NotificationMessage.render(
                    NotificationFamily.PLAIN_RESULT,
                    variant,
                    new Facts(null, null, true, null, null, null, false))
                .body())
        .contains("score indisponible");
  }

  @ParameterizedTest
  @EnumSource(NotificationVariant.class)
  @DisplayName("A correction replaces score values within the same stored editorial choice")
  void replacesCorrectedScore(NotificationVariant variant) {
    // Given
    Facts original = new Facts("Nantes", "Tours", true, 3, 1, null, true);
    Facts corrected = new Facts("Nantes", "Tours", true, 2, 3, null, false);

    // When
    NotificationMessage before =
        NotificationMessage.render(NotificationFamily.ENRICHED_RESULT, variant, original);
    NotificationMessage after =
        NotificationMessage.render(NotificationFamily.ENRICHED_RESULT, variant, corrected);

    // Then
    assertThat(after.title()).isEqualTo(before.title());
    assertThat(after.body()).contains("2–3").doesNotContain("3–1", "Un lien a été proposé");
  }
}
