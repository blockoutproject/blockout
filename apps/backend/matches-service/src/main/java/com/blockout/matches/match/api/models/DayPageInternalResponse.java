package com.blockout.matches.match.api.models;

import java.util.List;

public record DayPageInternalResponse(
    List<DayMatchesInternalResponse> dayMatches,
    boolean hasNext,
    Integer nextPage) {
}
