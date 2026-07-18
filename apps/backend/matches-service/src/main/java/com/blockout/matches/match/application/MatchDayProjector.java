package com.blockout.matches.match.application;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MatchDayProjector {

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final MatchDetailProjector details;

    public List<MatchDayView> project(
            List<LocalDate> selectedDays,
            List<MatchSnapshot> range,
            List<MatchLiveProjection> activeLinks) {
        Map<Long, MatchLiveProjection> activeByMatch = activeLinks.stream()
                .collect(Collectors.toMap(MatchLiveProjection::matchId, Function.identity(),
                        (left, right) -> left.createdAt().isAfter(right.createdAt()) ? left : right));
        Map<LocalDate, List<MatchSnapshot>> matchesByDate = range.stream().collect(Collectors.groupingBy(
                match -> ZonedDateTime.ofInstant(match.matchDate(), PARIS).toLocalDate()));
        return selectedDays.stream()
                .map(day -> dayView(day, matchesByDate.getOrDefault(day, List.of()), activeByMatch))
                .toList();
    }

    private MatchDayView dayView(
            LocalDate day,
            List<MatchSnapshot> matchesForDay,
            Map<Long, MatchLiveProjection> activeByMatch) {
        Map<Long, List<MatchSnapshot>> byPool = matchesForDay.stream()
                .collect(Collectors.groupingBy(MatchSnapshot::poolId, TreeMap::new, Collectors.toList()));
        List<MatchDayPoolView> pools = byPool.entrySet().stream()
                .map(entry -> new MatchDayPoolView(entry.getKey(), entry.getValue().stream()
                        .map(match -> details.project(match, activeByMatch.get(match.id())))
                        .toList()))
                .toList();
        return new MatchDayView(day, pools);
    }
}
