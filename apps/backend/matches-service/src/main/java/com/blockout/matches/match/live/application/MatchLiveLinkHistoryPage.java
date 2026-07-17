package com.blockout.matches.match.live.application;

import java.util.List;

public record MatchLiveLinkHistoryPage(
        List<MatchLiveLinkHistoryItemView> items,
        int page,
        int pageSize,
        long totalItems,
        boolean hasNext) {
}
