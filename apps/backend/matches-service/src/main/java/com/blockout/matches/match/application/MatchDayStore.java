package com.blockout.matches.match.application;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public interface MatchDayStore {

    List<LocalDate> findUpcomingDays(LocalDate todayParis, MatchDayQuery query);

    List<LocalDate> findPastDays(Instant now, MatchDayQuery query);

    List<MatchSnapshot> findUpcomingRange(Instant start, Instant end, MatchDayQuery query);

    List<MatchSnapshot> findPastRange(Instant start, Instant end, MatchDayQuery query);
}
