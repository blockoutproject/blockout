package com.blockout.matches.match.application;

import java.time.LocalDate;
import java.util.List;

public record MatchDayView(LocalDate date, List<MatchDayPoolView> pools) {
}
