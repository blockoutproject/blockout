package com.blockout.matches.match.application;

import com.blockout.shared.model.MatchStatusEnum;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MatchDayProjectionService {

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final MatchDayStore matches;
    private final MatchLiveProjectionStore liveLinks;
    private final MatchDayProjector projector;
    private final Clock clock;

    @Transactional(readOnly = true)
    public MatchDayPage findPage(MatchDayQuery query) {
        Instant now = clock.instant();
        LocalDate todayParis = LocalDate.now(clock.withZone(PARIS));
        boolean upcoming = query.status() == MatchStatusEnum.UPCOMING;
        List<LocalDate> allDays = upcoming
                ? matches.findUpcomingDays(todayParis, query)
                : matches.findPastDays(now, query);

        int fromIndex = query.page() * query.pageSize();
        if (fromIndex >= allDays.size()) {
            return new MatchDayPage(List.of(), false, null);
        }

        int toIndex = Math.min(fromIndex + query.pageSize(), allDays.size());
        List<LocalDate> selectedDays = allDays.subList(fromIndex, toIndex);
        LocalDate minDay = upcoming ? selectedDays.getFirst() : selectedDays.getLast();
        LocalDate maxDay = upcoming ? selectedDays.getLast() : selectedDays.getFirst();
        Instant start = minDay.atStartOfDay(PARIS).toInstant();
        Instant end = upcoming
                ? maxDay.plusDays(1).atStartOfDay(PARIS).toInstant()
                : maxDay.equals(todayParis) ? now : maxDay.plusDays(1).atStartOfDay(PARIS).toInstant();

        List<MatchSnapshot> range = upcoming
                ? matches.findUpcomingRange(start, end, query)
                : matches.findPastRange(start, end, query);
        boolean hasNext = toIndex < allDays.size();
        Integer nextPage = hasNext ? query.page() + 1 : null;
        if (range.isEmpty()) {
            return new MatchDayPage(List.of(), false, nextPage);
        }

        List<Long> matchIds = range.stream().map(MatchSnapshot::id).distinct().toList();
        return new MatchDayPage(
                projector.project(selectedDays, range, liveLinks.findActiveByMatchIds(matchIds)),
                hasNext,
                nextPage);
    }
}
