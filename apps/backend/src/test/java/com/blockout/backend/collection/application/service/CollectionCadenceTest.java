package com.blockout.backend.collection.application.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.collection.application.model.CollectionState.Target;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;

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
  @DisplayName("Becomes due at the exact cadence after the last attempt")
  void selectsAtExactAttemptCadence(CollectionTargetKindEnum kind, boolean fast, int seconds) {
    // Given
    Instant attempt = Instant.parse("2026-10-24T09:00:00Z");
    Target target =
        Target.builder()
            .kind(kind)
            .lastAttemptAt(attempt)
            .fastWindowEndsAt(fast ? attempt.plusSeconds(14400) : null)
            .build();

    // When
    boolean beforeCadence = FreezeCollectionTargets.due(target, attempt.plusSeconds(seconds - 1));
    boolean atCadence = FreezeCollectionTargets.due(target, attempt.plusSeconds(seconds));

    // Then
    assertThat(beforeCadence).isFalse();
    assertThat(atCadence).isTrue();
  }

  @ParameterizedTest
  @EnumSource(CollectionTargetKindEnum.class)
  @DisplayName("Admits a target that has never been attempted")
  void admitsNeverAttemptedTarget(CollectionTargetKindEnum kind) {
    // Given
    Instant now = Instant.parse("2026-10-24T09:00:00Z");
    Target target = Target.builder().kind(kind).lastAttemptAt(null).build();

    // When
    boolean due = FreezeCollectionTargets.due(target, now);

    // Then
    assertThat(due).isTrue();
  }
}
