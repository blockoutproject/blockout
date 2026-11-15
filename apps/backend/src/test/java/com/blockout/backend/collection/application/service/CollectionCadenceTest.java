package com.blockout.backend.collection.application.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.collection.application.model.CollectionState.Target;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Competition reads follow scheduled periods; seasonless reads retain exact attempt delays. */
@DisplayName("Acquisition attempt cadence")
class CollectionCadenceTest {
  @ParameterizedTest(name = "{0} fast={1} becomes due after {2} seconds")
  @CsvSource({
    "DISCOVERY,false,1800",
    "CALENDAR,false,1800",
    "STANDINGS,false,1800",
    "CALENDAR,true,300",
    "STANDINGS,true,300",
    "DETAILS,false,3600",
    "DETAILS,true,300"
  })
  @DisplayName("A read completed after a tick remains due at the next scheduled period")
  void selectsNextScheduledPeriod(CollectionTargetKindEnum kind, boolean fast, int seconds) {
    // Given
    Instant tick = Instant.parse("2026-10-24T09:00:00Z");
    Target target =
        Target.builder()
            .kind(kind)
            .lastAttemptAt(tick.plusSeconds(1))
            .fastWindowEndsAt(fast ? tick.plusSeconds(14400) : null)
            .build();

    // When
    boolean samePeriod = FreezeCollectionTargets.due(target, tick.plusSeconds(seconds - 1));
    boolean nextPeriod = FreezeCollectionTargets.due(target, tick.plusSeconds(seconds));
    boolean delayedAdmission = FreezeCollectionTargets.due(target, tick.plusSeconds(seconds + 1));

    // Then
    assertThat(samePeriod).isFalse();
    assertThat(nextPeriod).isTrue();
    assertThat(delayedAdmission).isTrue();
  }

  @ParameterizedTest(name = "{0} skips 09:05 and resumes at {2}")
  @CsvSource({
    "CALENDAR,2026-10-24T08:30:01Z,2026-10-24T09:30:00Z",
    "DETAILS,2026-10-24T08:00:01Z,2026-10-24T10:00:00Z"
  })
  @DisplayName("A missed slow opportunity waits for the next scheduled cadence slot")
  void skipsMissedSlowOpportunity(
      CollectionTargetKindEnum kind, String observedAt, String nextScheduledAt) {
    // Given
    Target target = Target.builder().kind(kind).lastAttemptAt(Instant.parse(observedAt)).build();

    // When
    boolean delayedPoll =
        FreezeCollectionTargets.due(target, Instant.parse("2026-10-24T09:05:00Z"));
    boolean nextOpportunity = FreezeCollectionTargets.due(target, Instant.parse(nextScheduledAt));

    // Then
    assertThat(delayedPoll).isFalse();
    assertThat(nextOpportunity).isTrue();
  }

  @Test
  @DisplayName("An overrun waits for the next scheduled period without replaying missed periods")
  void skipsMissedPeriodsAfterOverrun() {
    // Given
    Target target =
        Target.builder()
            .kind(CollectionTargetKindEnum.CALENDAR)
            .lastAttemptAt(Instant.parse("2026-10-24T09:11:00Z"))
            .fastWindowEndsAt(Instant.parse("2026-10-24T13:00:00Z"))
            .build();

    // When
    boolean samePeriod = FreezeCollectionTargets.due(target, Instant.parse("2026-10-24T09:14:59Z"));
    boolean nextPeriod = FreezeCollectionTargets.due(target, Instant.parse("2026-10-24T09:15:00Z"));

    // Then
    assertThat(samePeriod).isFalse();
    assertThat(nextPeriod).isTrue();
  }

  @ParameterizedTest(name = "{0} retains its exact {1}-second delay")
  @CsvSource({"CLUB_SHEET,86400", "GEOCODING,3600"})
  @DisplayName("Seasonless reads wait for the full delay after the actual attempt")
  void preservesSeasonlessAttemptDelay(CollectionTargetKindEnum kind, int seconds) {
    // Given
    Instant tick = Instant.parse("2026-10-24T09:00:00Z");
    Target target = Target.builder().kind(kind).lastAttemptAt(tick.plusSeconds(1)).build();

    // When
    boolean beforeDelay = FreezeCollectionTargets.due(target, tick.plusSeconds(seconds));
    boolean atDelay = FreezeCollectionTargets.due(target, tick.plusSeconds(seconds + 1));

    // Then
    assertThat(beforeDelay).isFalse();
    assertThat(atDelay).isTrue();
  }

  @Test
  @DisplayName("Admits a target that has never been attempted")
  void admitsNeverAttemptedTarget() {
    // Given
    Instant now = Instant.parse("2026-10-24T09:00:00Z");
    Target target =
        Target.builder().kind(CollectionTargetKindEnum.CALENDAR).lastAttemptAt(null).build();

    // When
    boolean due = FreezeCollectionTargets.due(target, now);

    // Then
    assertThat(due).isTrue();
  }
}
