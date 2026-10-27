package com.blockout.backend.sporting.application;

import com.blockout.backend.shared.mapping.TemporalMapping;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarRequest;
import com.blockout.backend.sporting.application.ConsultationStore.CalendarEntry;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Reads complete sporting days from the current F02-owned facts. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ReadMatchCalendar {
  private final ConsultationStore store;
  private final ReadSportingData owners;
  private final ReadSportingResources resources;
  private final Clock clock;

  /**
   * Reads one complete-day window in the captured grouping context.
   *
   * @param request exact resource, category, zone and exclusive day
   * @return at most seven complete nonempty days
   * @throws SportingResourceNotFoundException when the exact selector or club season is unavailable
   */
  public ConsultationViews.Calendar read(CalendarRequest request) {
    Instant now = clock.instant();
    owners
        .publicPresentation(request.kind(), request.id())
        .orElseThrow(SportingResourceNotFoundException::new);
    if (request.seasonId() != null && owners.season(request.seasonId()).isEmpty())
      throw new SportingResourceNotFoundException();
    List<LocalDate> selected = store.calendarDays(request, now);
    List<LocalDate> days = selected.subList(0, Math.min(7, selected.size()));
    Map<LocalDate, Map<UUID, List<ConsultationViews.MatchSummary>>> grouped = new LinkedHashMap<>();
    for (CalendarEntry entry : store.calendarMatches(request, days, now)) {
      grouped
          .computeIfAbsent(entry.day(), ignored -> new LinkedHashMap<>())
          .computeIfAbsent(entry.match().poolId(), ignored -> new ArrayList<>())
          .add(resources.matchSummary(entry.match(), now));
    }
    List<ConsultationViews.Day> result =
        grouped.entrySet().stream()
            .map(
                day ->
                    new ConsultationViews.Day(
                        day.getKey(),
                        day.getValue().entrySet().stream()
                            .map(
                                pool ->
                                    new ConsultationViews.PoolGroup(pool.getKey(), pool.getValue()))
                            .toList()))
            .toList();
    return new ConsultationViews.Calendar(
        request.category(),
        request.timeZone().getId(),
        TemporalMapping.toDate(now),
        result,
        selected.size() > 7 ? days.getLast() : null);
  }
}
