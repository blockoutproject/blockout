package com.blockout.backend.sporting.application;

import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** F03 presentation only; callers first enforce F02 visibility and a usable sporting date. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class MatchPresentation {
  /**
   * Classifies current accepted facts at one request instant, independently of display zone.
   *
   * @param schedule current visible schedule with a usable local date
   * @param result accepted official result, or null after absence/withdrawal
   * @param now single evaluation instant sampled by the read owner
   * @return Completed for a definitive result or at the applicable time boundary
   */
  public static CalendarCategoryEnum category(
      ConsultationViews.Schedule schedule, ConsultationViews.Result result, Instant now) {
    if (result != null && result.state() == ResultStateEnum.FINAL)
      return CalendarCategoryEnum.COMPLETED;
    Instant boundary =
        schedule.instant() == null
            ? schedule.localDate().plusDays(1).atStartOfDay(ZoneId.of("Europe/Paris")).toInstant()
            : schedule.instant().toInstant().plus(Duration.ofHours(6));
    return now.isBefore(boundary) ? CalendarCategoryEnum.UPCOMING : CalendarCategoryEnum.COMPLETED;
  }
}
