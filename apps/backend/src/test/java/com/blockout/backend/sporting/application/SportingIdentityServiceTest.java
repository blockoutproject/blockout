package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.blockout.backend.sporting.domain.TeamName;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Exercises the deliberately narrow name comparison and unresolved-participant boundary. */
@DisplayName("Sporting identity decisions")
class SportingIdentityServiceTest {
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

  @Test
  @DisplayName("Rejects an undetermined participant before consulting persistence")
  void rejectsUndeterminedParticipant() {
    // Given
    SportingStore store = mock(SportingStore.class);
    SportingIdentityService service = new SportingIdentityService(store);
    UUID pool = UUID.fromString("00000000-0000-4000-8000-000000000001");
    TeamCandidate away = new TeamCandidate(null, "Synthetic visitor", "0002", null);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable identify =
        () -> service.identifyMatch(pool, "M1", null, away);

    // Then
    assertThatThrownBy(identify).isInstanceOf(UnresolvedSportingIdentityException.class);
    verifyNoInteractions(store);
  }
}
