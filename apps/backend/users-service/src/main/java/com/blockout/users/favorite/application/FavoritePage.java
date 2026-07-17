package com.blockout.users.favorite.application;

import java.util.List;

/** Carries one stable page of canonical favorite summaries. */
public record FavoritePage(
        List<FavoriteView> items,
        int page,
        int pageSize,
        long totalItems,
        boolean hasNext) {

    /** Prevents persistence-backed collections from escaping the application boundary. */
    public FavoritePage {
        items = List.copyOf(items);
    }
}
