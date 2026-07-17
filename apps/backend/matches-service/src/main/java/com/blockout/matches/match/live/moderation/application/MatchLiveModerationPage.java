package com.blockout.matches.match.live.moderation.application;

import java.util.List;

public record MatchLiveModerationPage(
        List<MatchLiveModerationView> items,
        int page,
        int pageSize,
        long totalItems,
        boolean hasNext) {
}
