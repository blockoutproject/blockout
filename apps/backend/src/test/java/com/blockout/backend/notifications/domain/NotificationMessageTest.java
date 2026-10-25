package com.blockout.backend.notifications.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.notifications.domain.NotificationMessage.Facts;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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
            });
  }

  @ParameterizedTest
  @CsvSource({
    "PLAIN_RESULT,FIRST", "PLAIN_RESULT,SECOND", "PLAIN_RESULT,THIRD",
    "ENRICHED_RESULT,FIRST", "ENRICHED_RESULT,SECOND", "ENRICHED_RESULT,THIRD"
  })
  @DisplayName("Includes the reliable final score in every result variant")
  void includesCurrentScore(NotificationFamily family, NotificationVariant variant) {
    // Given
    Facts facts = new Facts("Nantes", "Tours", true, 3, 1, null, true);

    // When
    NotificationMessage message = NotificationMessage.render(family, variant, facts);

    // Then
    assertThat(message.body()).contains("3–1");
  }

  @ParameterizedTest
  @CsvSource({
    "PLAIN_RESULT,FIRST", "PLAIN_RESULT,SECOND", "PLAIN_RESULT,THIRD",
    "ENRICHED_RESULT,FIRST", "ENRICHED_RESULT,SECOND", "ENRICHED_RESULT,THIRD",
    "LIVE_LINK,FIRST", "LIVE_LINK,SECOND", "LIVE_LINK,THIRD",
    "POST_RESULT_LINK,FIRST", "POST_RESULT_LINK,SECOND", "POST_RESULT_LINK,THIRD"
  })
  @DisplayName("Removes withdrawn result and link fragments from the retained editorial variant")
  void adaptsCurrentFacts(NotificationFamily family, NotificationVariant variant) {
    // Given
    Facts corrected = new Facts(null, " ", false, 3, 1, null, false);

    // When
    NotificationMessage message = NotificationMessage.render(family, variant, corrected);

    // Then
    assertThat(message.body())
        .doesNotContain("3–1", "null", "disponible", "victoire", "en direct")
        .contains("match");
  }

  @ParameterizedTest
  @EnumSource(NotificationVariant.class)
  @DisplayName("Preserves recognized special results without inventing a winner or numeric score")
  void preservesSpecialResult(NotificationVariant variant) {
    // Given
    Facts special = new Facts("Nantes", null, true, null, null, "F/P", false);

    // When
    NotificationMessage message =
        NotificationMessage.render(NotificationFamily.ENRICHED_RESULT, variant, special);

    // Then
    assertThat(message.body())
        .contains("Nantes", "F/P")
        .doesNotContain("3–0", "victoire", "disponible", "null");
  }

  @ParameterizedTest
  @EnumSource(NotificationVariant.class)
  @DisplayName("Acknowledges an unavailable score without inventing a numeric result")
  void preservesUnknownScore(NotificationVariant variant) {
    // Given
    Facts unknown = new Facts(null, null, true, null, null, null, false);

    // When
    NotificationMessage message =
        NotificationMessage.render(NotificationFamily.PLAIN_RESULT, variant, unknown);

    // Then
    assertThat(message.body()).contains("score indisponible").doesNotContain("null", "3–0");
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
