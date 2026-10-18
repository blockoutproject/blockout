package com.blockout.backend.sporting.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Exercises the comparison allowed by F02 while preserving original source labels. */
@DisplayName("Sporting team name comparison")
class TeamNameTest {
  @ParameterizedTest
  @CsvSource(
      delimiter = '|',
      textBlock =
          """
      Saint  d’Or | saint d'or
      SAINT D'OR | saint d'or
      Équipe 2 | équipe 2
      Équipe.2 | équipe.2
      Équipe-2 | équipe-2
      Equipe 2 | equipe 2
      Équipe 3 | équipe 3
      """)
  @DisplayName("Normalizes only case, spaces and typographic apostrophes")
  void comparesOnlyApprovedNameDifferences(String source, String comparison) {
    // Given
    TeamName name = new TeamName(source);

    // When
    String result = name.comparisonKey();

    // Then
    assertThat(result).isEqualTo(comparison);
    assertThat(name.source()).isEqualTo(source);
  }
}
