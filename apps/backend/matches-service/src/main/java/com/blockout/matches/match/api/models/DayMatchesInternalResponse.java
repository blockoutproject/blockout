package com.blockout.matches.match.api.models;

import java.time.LocalDate;
import java.util.List;

public record DayMatchesInternalResponse(LocalDate date, List<PoolMatchesInternalResponse> pools) {
}
