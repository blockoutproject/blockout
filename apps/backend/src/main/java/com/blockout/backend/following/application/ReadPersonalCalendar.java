package com.blockout.backend.following.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarWindow;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.ReadMatchCalendar;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Composes original-account follow selection with the F03 complete-day calendar. */
@Service
@RequiredArgsConstructor
public class ReadPersonalCalendar {
  private final AccountAccess accounts;
  private final FollowReadStore follows;
  private final ReadMatchCalendar calendars;

  /**
   * Reads the availability explanation and complete days from one current snapshot.
   *
   * @param accountId admitted original usable account
   * @param seasonId selected sporting season, or null for all seasons
   * @param window F03 category, loading zone and exclusive continuation
   * @return detached explanation and shared sporting calendar
   * @throws AccountNotFoundException if the original lifecycle disappeared
   * @throws FollowUnavailableTargetException if the selected season is no longer available
   */
  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public Calendar read(UUID accountId, UUID seasonId, CalendarWindow window) {
    if (!accounts.exists(accountId)) throw new AccountNotFoundException();
    List<FollowReadStore.SeasonChoice> choices = follows.seasons(accountId);
    if (seasonId != null && choices.stream().noneMatch(choice -> choice.id().equals(seasonId)))
      throw new FollowUnavailableTargetException();
    boolean available =
        choices.stream()
            .anyMatch(
                choice -> choice.followed() && (seasonId == null || seasonId.equals(choice.id())));
    return new Calendar(
        available, calendars.read(window, follows.calendarSelection(accountId, seasonId)));
  }

  /**
   * Category-independent current follow availability alongside the ordinary F03 calendar.
   *
   * @param hasAvailableFollows whether any current follow is available in the selected season scope
   * @param calendar complete-day F03 response from the same database snapshot
   */
  public record Calendar(boolean hasAvailableFollows, ConsultationViews.Calendar calendar) {}
}
