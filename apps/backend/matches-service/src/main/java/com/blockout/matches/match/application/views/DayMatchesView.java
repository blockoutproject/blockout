package com.blockout.matches.match.application.views;

import java.time.LocalDate;
import java.util.List;

public record DayMatchesView(LocalDate date, List<PoolMatchesView> pools) {
}
