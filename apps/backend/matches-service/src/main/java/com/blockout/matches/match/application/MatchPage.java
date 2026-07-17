package com.blockout.matches.match.application;

import java.util.List;

public record MatchPage(
        List<MatchSnapshot> items,
        int page,
        int pageSize,
        long totalItems,
        boolean hasNext) {
}
