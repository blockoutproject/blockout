package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Shared classification boundaries, with no sporting result or display-zone inference. */
@DisplayName("Current match presentation")
class MatchPresentationTest {
  @ParameterizedTest
  @CsvSource({
    "2026-03-29,2026-03-29T00:30:00Z,2026-03-29T06:29:59Z,UPCOMING",
    "2026-03-29,2026-03-29T00:30:00Z,2026-03-29T06:30:00Z,COMPLETED",
    "2026-10-25,2026-10-25T00:30:00Z,2026-10-25T06:29:59Z,UPCOMING",
    "2026-10-25,2026-10-25T00:30:00Z,2026-10-25T06:30:00Z,COMPLETED"
  })
  @DisplayName("Uses six elapsed hours through both daylight-saving changes")
  void usesElapsedHours(
      LocalDate date, OffsetDateTime kickoff, Instant now, CalendarCategoryEnum expected) {
    // Given
    ConsultationViews.Schedule schedule =
        new ConsultationViews.Schedule(date, kickoff, "Europe/Paris", null);

    // When
    CalendarCategoryEnum category = MatchPresentation.category(schedule, null, now);

    // Then
    assertThat(category).isEqualTo(expected);
  }

  @ParameterizedTest
  @CsvSource({
    "2026-03-29,2026-03-29T21:59:59Z,UPCOMING",
    "2026-03-29,2026-03-29T22:00:00Z,COMPLETED",
    "2026-10-25,2026-10-25T22:59:59Z,UPCOMING",
    "2026-10-25,2026-10-25T23:00:00Z,COMPLETED"
  })
  @DisplayName("Ends a date-only day at the following Paris midnight")
  void usesParisMidnight(LocalDate date, Instant now, CalendarCategoryEnum expected) {
    // Given
    ConsultationViews.Schedule schedule = new ConsultationViews.Schedule(date, null, null, null);

    // When
    CalendarCategoryEnum category = MatchPresentation.category(schedule, null, now);

    // Then
    assertThat(category).isEqualTo(expected);
    assertThat(schedule.instant()).isNull();
  }

  @ParameterizedTest
  @CsvSource({"FINAL,COMPLETED", "PROVISIONAL,UPCOMING", "UNCONFIRMED,UPCOMING"})
  @DisplayName("Uses official finality rather than special notation for early completion")
  void usesFinality(ResultStateEnum state, CalendarCategoryEnum expected) {
    // Given
    ConsultationViews.Schedule schedule =
        new ConsultationViews.Schedule(LocalDate.of(2027, 1, 1), null, null, null);
    ConsultationViews.Result result = new ConsultationViews.Result(state, null, null, "F", null);

    // When
    CalendarCategoryEnum category =
        MatchPresentation.category(schedule, result, Instant.parse("2026-10-24T12:00:00Z"));

    // Then
    assertThat(category).isEqualTo(expected);
  }

  @Test
  @DisplayName("Reclassifies a postponed match from its current schedule")
  void reclassifiesPostponedMatch() {
    // Given
    Instant now = Instant.parse("2026-10-24T12:00:00Z");
    ConsultationViews.Schedule old =
        new ConsultationViews.Schedule(LocalDate.of(2026, 10, 20), null, null, null);
    ConsultationViews.Schedule postponed =
        new ConsultationViews.Schedule(LocalDate.of(2026, 11, 1), null, null, null);

    // When
    CalendarCategoryEnum before = MatchPresentation.category(old, null, now);
    CalendarCategoryEnum after = MatchPresentation.category(postponed, null, now);

    // Then
    assertThat(before).isEqualTo(CalendarCategoryEnum.COMPLETED);
    assertThat(after).isEqualTo(CalendarCategoryEnum.UPCOMING);
  }

  @ParameterizedTest
  @CsvSource({"Europe/Paris", "America/New_York"})
  @DisplayName("Classifies the same accepted instant independently of its displayed offset")
  void preservesCategoryAcrossZones(String zone) {
    // Given
    Instant kickoff = Instant.parse("2026-09-19T22:30:00Z");
    ConsultationViews.Schedule schedule =
        new ConsultationViews.Schedule(
            LocalDate.of(2026, 9, 20),
            kickoff.atZone(ZoneId.of(zone)).toOffsetDateTime(),
            "Europe/Paris",
            null);
    Instant now = Instant.parse("2026-09-20T04:30:00Z");

    // When
    CalendarCategoryEnum result = MatchPresentation.category(schedule, null, now);

    // Then
    assertThat(result).isEqualTo(CalendarCategoryEnum.COMPLETED);
  }

  @Test
  @DisplayName("Reapplies the current schedule after an early definitive result is withdrawn")
  void reappliesScheduleAfterResultWithdrawal() {
    // Given
    Instant now = Instant.parse("2026-10-24T12:00:00Z");
    ConsultationViews.Schedule schedule =
        new ConsultationViews.Schedule(LocalDate.of(2026, 11, 1), null, null, null);
    ConsultationViews.Result accepted =
        new ConsultationViews.Result(ResultStateEnum.FINAL, 3, 0, null, null);

    // When
    CalendarCategoryEnum published = MatchPresentation.category(schedule, accepted, now);
    CalendarCategoryEnum withdrawn = MatchPresentation.category(schedule, null, now);

    // Then
    assertThat(published).isEqualTo(CalendarCategoryEnum.COMPLETED);
    assertThat(withdrawn).isEqualTo(CalendarCategoryEnum.UPCOMING);
  }
}
