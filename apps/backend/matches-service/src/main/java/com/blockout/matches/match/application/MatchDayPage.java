package com.blockout.matches.match.application;

import java.util.List;

public record MatchDayPage(List<MatchDayView> dayMatches, boolean hasNext, Integer nextPage) {
}
