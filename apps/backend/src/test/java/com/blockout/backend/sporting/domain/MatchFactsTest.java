package com.blockout.backend.sporting.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;

/** Synthetic sporting examples; no fixture claims live provider qualification. */
@DisplayName("Official match fact decisions")
class MatchFactsTest {
  @ParameterizedTest
  @CsvSource(
      nullValues = "NULL",
      value = {
        "NULL,NULL,F,true",
        "NULL,NULL,P,true",
        "NULL,NULL,3/F,true",
        "NULL,NULL,3/P,true",
        "NULL,NULL,F/F,true",
        "NULL,NULL,2/F,true",
        "NULL,NULL,F/P,true",
        "3,0,F,false",
        "3,0,P,false",
        "3,0,3/F,false",
        "3,0,3/P,false",
        "3,0,F/F,false",
        "3,0,2/F,false",
        "3,0,F/P,false",
        "2,0,NULL,true",
        "1,1,NULL,true",
        "3,NULL,NULL,false",
        "NULL,3,NULL,false",
        "-1,0,NULL,false",
        "0,-1,NULL,false",
        "NULL,NULL,UNINTERPRETED,false"
      })
  @DisplayName("Accepts complete numeric totals or recognized special notation exclusively")
  void recognizesUsableResult(Integer home, Integer away, String notation, boolean expected) {
    // Given
    // Each row states the complete published representation and its expected usability.

    // When
    boolean usable = MatchFacts.usableResult(home, away, notation);

    // Then
    assertThat(usable).isEqualTo(expected);
  }

  @ParameterizedTest
  @MethodSource("publishedSetDetails")
  @DisplayName("Checks played sets against authoritative totals without reconstructing a result")
  void checksSetCompatibility(
      Integer home, Integer away, List<MatchFacts.SetScore> sets, boolean expected) {
    // Given
    // The source supplies literal scores, rather than deriving totals using the production rule.

    // When
    boolean compatible = MatchFacts.compatibleSets(home, away, sets);

    // Then
    assertThat(compatible).isEqualTo(expected);
  }

  @ParameterizedTest
  @CsvSource(
      nullValues = "NULL",
      value = {
        "2026-03-29,02:30,Europe/Paris,NULL",
        "2026-10-25,02:30,Europe/Paris,NULL",
        "2026-10-19,20:00,Europe/Paris,2026-10-19T18:00:00Z",
        "2026-10-19,NULL,Europe/Paris,NULL",
        "NULL,20:00,Europe/Paris,NULL",
        "2026-10-19,20:00,NULL,NULL",
        "2026-10-19,20:00,not-a-zone,NULL",
        "2026-10-19,25:00,Europe/Paris,NULL"
      })
  @DisplayName("Resolves only a complete source time with one unambiguous zone offset")
  void resolvesOnlyKnownStart(LocalDate date, String time, String zone, Instant expected) {
    // Given
    // The source fixes missing, invalid and daylight-saving boundary inputs explicitly.

    // When
    Instant start = MatchFacts.resolveStart(date, time, zone);

    // Then
    assertThat(start).isEqualTo(expected);
  }

  /** Supplies independent examples of official totals and the published set details. */
  private static Stream<Arguments> publishedSetDetails() {
    List<MatchFacts.SetScore> splitSets =
        List.of(new MatchFacts.SetScore(25, 20), new MatchFacts.SetScore(21, 25));
    return Stream.of(
        Arguments.of(1, 1, splitSets, true),
        Arguments.of(2, 0, splitSets, false),
        Arguments.of(null, null, splitSets, false),
        Arguments.of(1, 0, List.of(new MatchFacts.SetScore(20, 20)), false),
        Arguments.of(1, 0, List.of(new MatchFacts.SetScore(25, -1)), false),
        Arguments.of(0, 1, List.of(new MatchFacts.SetScore(-1, 25)), false),
        Arguments.of(1, 0, null, false));
  }
}
