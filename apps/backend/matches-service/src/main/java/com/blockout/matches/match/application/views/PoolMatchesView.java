package com.blockout.matches.match.application.views;

import java.util.List;

public record PoolMatchesView(Long poolId, List<MatchView> matches) {
}
