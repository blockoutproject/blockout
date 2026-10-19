package com.blockout.backend.sporting.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

/** Synthetic sporting examples; no fixture claims live provider qualification. */
@DisplayName("Official match fact decisions")
class MatchFactsTest {
  @ParameterizedTest
  @ValueSource(strings = {"F", "P", "3/F", "3/P", "F/F", "2/F", "F/P"})
  @DisplayName("Preserves recognized special notation without numeric substitution")
  void recognizesSpecialNotation(String notation) {
    // When / Then
    assertThat(MatchFacts.usableResult(null, null, notation)).isTrue();
    assertThat(MatchFacts.usableResult(3, 0, notation)).isFalse();
  }

  @Test
  @DisplayName("Accepts published numeric totals without a universal winning-set threshold")
  void acceptsOfficialTotals() {
    // When / Then
    assertThat(MatchFacts.usableResult(2, 0, null)).isTrue();
    assertThat(MatchFacts.usableResult(1, 1, null)).isTrue();
    assertThat(MatchFacts.usableResult(3, null, null)).isFalse();
    assertThat(MatchFacts.usableResult(null, null, "UNINTERPRETED")).isFalse();
  }

  @Test
  @DisplayName("Checks set compatibility without reconstructing an overall result")
  void checksSetCompatibility() {
    // Given
    List<MatchFacts.SetScore> sets =
        List.of(new MatchFacts.SetScore(25, 20), new MatchFacts.SetScore(21, 25));

    // When / Then
    assertThat(MatchFacts.compatibleSets(1, 1, sets)).isTrue();
    assertThat(MatchFacts.compatibleSets(2, 0, sets)).isFalse();
    assertThat(MatchFacts.compatibleSets(null, null, sets)).isFalse();
    assertThat(MatchFacts.compatibleSets(1, 0, List.of(new MatchFacts.SetScore(20, 20)))).isFalse();
  }

  @ParameterizedTest
  @CsvSource({"2026-03-29,02:30", "2026-10-25,02:30"})
  @DisplayName("DST gaps and overlaps stay unresolved")
  void refusesAmbiguousInstant(LocalDate date, String time) {
    // When / Then
    assertThat(MatchFacts.resolveStart(date, time, "Europe/Paris")).isNull();
  }

  @Test
  @DisplayName("Resolves ordinary source time while preserving date-only and dateless states")
  void resolvesOnlyKnownStart() {
    // Given
    LocalDate date = LocalDate.of(2026, 10, 19);

    // When / Then
    assertThat(MatchFacts.resolveStart(date, "20:00", "Europe/Paris"))
        .isEqualTo(Instant.parse("2026-10-19T18:00:00Z"));
    assertThat(MatchFacts.resolveStart(date, null, "Europe/Paris")).isNull();
    assertThat(MatchFacts.resolveStart(null, "20:00", "Europe/Paris")).isNull();
    assertThat(MatchFacts.resolveStart(date, "20:00", "not-a-zone")).isNull();
  }
}
