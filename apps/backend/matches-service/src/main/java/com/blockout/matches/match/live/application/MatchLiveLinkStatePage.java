package com.blockout.matches.match.live.application;

import java.util.List;

public record MatchLiveLinkStatePage(
        List<MatchLiveLinkSnapshot> items,
        long totalItems,
        boolean hasNext) {
}
