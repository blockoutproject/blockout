package com.blockout.backend.collection.application.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.collection.application.model.CollectionState.Target;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Due selection uses actual attempts rather than scheduler ticks or successful results. */
@DisplayName("Acquisition attempt cadence")
class CollectionCadenceTest {
  @ParameterizedTest
  @CsvSource({
    "DISCOVERY,false,1800",
    "CALENDAR,false,1800",
    "STANDINGS,false,1800",
    "CALENDAR,true,300",
    "STANDINGS,true,300",
    "DETAILS,false,3600",
    "DETAILS,true,300",
    "CLUB_SHEET,false,86400",
    "GEOCODING,false,3600"
  })
  @DisplayName(
      "A target becomes due at its exact attempt cadence and never-attempted work is eligible")
  void selectsAtExactAttemptCadence(CollectionTargetKindEnum kind, boolean fast, int seconds) {
    // Given
    Instant attempt = Instant.parse("2026-10-24T09:00:00Z");
    Target target =
        Target.builder()
            .kind(kind)
            .lastAttemptAt(attempt)
            .fastWindowEndsAt(fast ? attempt.plusSeconds(14400) : null)
            .build();
    // When / Then
    assertThat(CollectionTargetSelector.due(target, attempt.plusSeconds(seconds - 1))).isFalse();
    assertThat(CollectionTargetSelector.due(target, attempt.plusSeconds(seconds))).isTrue();
    assertThat(
            CollectionTargetSelector.due(target.toBuilder().lastAttemptAt(null).build(), attempt))
        .isTrue();
  }
}
