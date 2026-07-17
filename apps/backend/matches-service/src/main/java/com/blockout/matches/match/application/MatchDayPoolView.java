package com.blockout.matches.match.application;

import java.util.List;

public record MatchDayPoolView(Long poolId, List<MatchDetailView> matches) {
}
