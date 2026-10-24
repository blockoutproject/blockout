package com.blockout.backend.contributions.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Proves calendar boundaries and ordinary limit decisions independently of publication writes. */
@DisplayName("Derived contribution quota policy")
class ContributionQuotaTest {
  @ParameterizedTest
  @CsvSource({
    "2026-03-29T10:00:00Z, 2026-03-28T23:00:00Z, 2026-03-29T22:00:00Z, 23",
    "2026-10-25T10:00:00Z, 2026-10-24T22:00:00Z, 2026-10-25T23:00:00Z, 25",
    "2026-10-24T21:59:59.999999999Z, 2026-10-23T22:00:00Z, 2026-10-24T22:00:00Z, 24",
    "2026-10-24T22:00:00Z, 2026-10-24T22:00:00Z, 2026-10-25T23:00:00Z, 25"
  })
  @DisplayName("Uses successive Paris midnights including both daylight-saving changes")
  void resolvesParisDay(Instant now, Instant start, Instant end, long hours) {
    // When
    ContributionQuota.Day day = ContributionQuota.dayAt(now);

    // Then
    assertThat(day.startsAt()).isEqualTo(start);
    assertThat(day.endsAt()).isEqualTo(end);
    assertThat(Duration.between(day.startsAt(), day.endsAt())).isEqualTo(Duration.ofHours(hours));
  }

  @ParameterizedTest
  @CsvSource({
    "0, 0, false, AVAILABLE",
    "2, 2, false, AVAILABLE",
    "3, 0, false, VERSION_LIMIT",
    "4, 0, false, VERSION_LIMIT",
    "2, 3, false, DAILY_MATCH_LIMIT",
    "2, 3, true, AVAILABLE",
    "3, 3, true, VERSION_LIMIT"
  })
  @DisplayName("Allows the third version/match and same-day continuation within the lifetime limit")
  void appliesDerivedLimits(
      long versions, long matches, boolean counted, ContributionQuota.Limit expected) {
    // Given
    ContributionQuota.Usage usage = new ContributionQuota.Usage(versions, matches, counted);

    // When
    ContributionQuota.Limit limit = ContributionQuota.limit(usage);

    // Then
    assertThat(limit).isEqualTo(expected);
  }
}
