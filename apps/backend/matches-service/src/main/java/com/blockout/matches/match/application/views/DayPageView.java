package com.blockout.matches.match.application.views;

import java.util.List;

public record DayPageView(List<DayMatchesView> dayMatches, boolean hasNext, Integer nextPage) {
}
